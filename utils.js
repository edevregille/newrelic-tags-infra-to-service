const axios = require('axios');
const fs = require('fs');

const { FETCH_ENTITIES_QUERY, FETCH_HOSTS_TAGS, ADD_TAG_TO_ENTITY_QUERY, DELETE_TAG_TO_ENTITY_QUERY } = require('./queries');
const API_KEY = process.env.NEWRELIC_USER_API_KEY;

const OPTIONS = {
    method:"POST",
    url: 'https://api.newrelic.com/graphql',
    headers: {
        'API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
};

const SYMBOLS = {
    working: "\uD83D\uDE80",
    error: "\uD83D\uDE31",
    success: "\uD83D\uDC4F",
};

const log = (msg, type='log') =>{
    console[type](msg)
}

const fetchEntitiesPaging = async (action, accountId, nextCursorValue,  TAG_KEY_TO_ADD) => {
    try {
        const result = await axios({
            ...OPTIONS,
            data: JSON.stringify({
                query: (action == "deleteTags") ? 
                    FETCH_ENTITIES_QUERY(nextCursorValue, `reporting = 'true' AND tags.accountId = '${accountId}' AND tags.${TAG_KEY_TO_ADD} IS NOT NULL AND type IN ('APPLICATION')`) 
                    : FETCH_ENTITIES_QUERY(nextCursorValue, `reporting = 'true' AND tags.accountId = '${accountId}' AND type IN ('APPLICATION')`),
                timeout: 120,
            })
        });
        if(result.data.errors){
            log(`${SYMBOLS.error} Failed fetching services entities ${JSON.stringify(result.data.errors)}`, 'error');
            return null;
        } 
        const {entities, nextCursor} = result.data.data.actor.entitySearch.results;
        return {entities, nextCursor};
    }catch(error){
        log(`${SYMBOLS.error} Failed (exception) fetching services entities ${JSON.stringify(error)}`, 'error');
        return null;
    }
}

exports.fetchEntities = async (action, accountId, TAG_KEY_TO_ADD) => {
    let nextCursor = 0, allEntities = [];
    log(`${SYMBOLS.working} Fetching reporting services entities from account ${accountId}...`);
    while (nextCursor != null){
        const result = await fetchEntitiesPaging(action, accountId, nextCursor == 0 ? null : nextCursor, TAG_KEY_TO_ADD);
        if(result){
            nextCursor = result.nextCursor;
            allEntities = allEntities.concat(result.entities);
        }else nextCursor = null;
    }
    log(`${SYMBOLS.success} Successfully fetched ${allEntities.length} services`);
    return allEntities;
}

exports.fetchInfraAWSTag = async (entities, TAG_KEY) => {
    let promises = [];
    try {
        log(`${SYMBOLS.working} Fetching Hosts tags for each service...`);
        entities.forEach(entity => {
            promises.push(
                axios({
                    ...OPTIONS,
                    data: JSON.stringify({
                        query: FETCH_HOSTS_TAGS(entity.guid),
                        timeout:120,
                    })
                })
            )
        });
        let results = await Promise.all(promises), countInfraPresent = 0, countAwsRegionTagPresent = 0;
        results.forEach((result, idx) => {
            if(result.data.errors){
                log(`${SYMBOLS.error} Failed fetching tags for service ${entities[idx].guid} ${JSON.stringify(result.data.errors)}`, 'error');
                entities[idx]["tag"] = null;
            }
            else{
                if(result.data.data.actor.entity && result.data.data.actor.entity.relatedEntities && result.data.data.actor.entity.relatedEntities.results && result.data.data.actor.entity.relatedEntities.results.length>0){
                    countInfraPresent ++;
                    let tags = result.data.data.actor.entity.relatedEntities.results.map(el => { return el.source.entity.tags }).flat();
                    if(tags.length > 0) {
                        tags = tags.filter(el => TAG_KEY.indexOf(el.key) > -1).map(el => { return el.values });
                        if(tags && tags.length >0){
                            countAwsRegionTagPresent++;
                            entities[idx]["tag"] = [...new Set(tags.flat())];
                        } else entities[idx]["tag"] = null
                    }
                }
                else entities[idx]["tag"] = null;
            }
        });
        fs.writeFileSync('entities_fetched.json', JSON.stringify(entities));
        log(`${SYMBOLS.success} Success fetching tags: ${countInfraPresent} service with Infra Hosts and ${countAwsRegionTagPresent} services`);
        return entities;
    }catch(error){
        log(`${SYMBOLS.error} Failed (exception) infra AWS tags ${JSON.stringify(error)}`, 'error');
        return null;
    }
}

exports.addEntitiesTag = async (entities, TAG_KEY_TO_ADD ) => {
    let promises = [];
    entities = entities.filter(el => el["tag"] != null && el["tag"].length >0);
    try{
        log(`${SYMBOLS.working} adding tag ${TAG_KEY_TO_ADD} to ${entities.length} entities...`);    
        entities.forEach(entity => {
            promises.push(
                axios({
                    ...OPTIONS,
                    data: JSON.stringify({"query": ADD_TAG_TO_ENTITY_QUERY(entity.guid, entity["tag"], TAG_KEY_TO_ADD)})
                })
            )
        });
        let results = await Promise.all(promises) , count = 0;
        results.forEach((result,idx) => {
            if(result.data.data && result.data.data.taggingReplaceTagsOnEntity &&  result.data.data.taggingReplaceTagsOnEntity.errors && result.data.data.taggingReplaceTagsOnEntity.errors.length >0 ) {
                log(`${SYMBOLS.error} - ${entities[idx].guid} Tagging did not work ${JSON.stringify(result.data.data.taggingReplaceTagsOnEntity.errors)}`, 'error');
                entities[idx]["Error"] = true;
            }
            else {
                count++;
                entities[idx]["Error"] = false;
            }
        });
        if(count > 0) {
            log(`${SYMBOLS.success} Success Tagging ${count} entities with ${TAG_KEY_TO_ADD} tag!!!`);
            fs.writeFileSync('entities_tags_added.json', JSON.stringify(entities));
        }
    }catch(e){
        log(`${SYMBOLS.error} Exception Tagging did not work  ${JSON.stringify(e)}`, 'error');
    }
}

exports.deleteEntitiesTag = async (entities, TAG_KEY_TO_ADD ) => {
    let promises = [];
    try {
        entities.forEach(entity => {
            promises.push(
                axios({
                    ...OPTIONS,
                    data: JSON.stringify({"query": DELETE_TAG_TO_ENTITY_QUERY(entity.guid, TAG_KEY_TO_ADD )})
                })
            );
        });
        let results = await Promise.all(promises), count = 0;
        results.forEach((result,idx) => {
            if(result.data.data.taggingDeleteTagFromEntity.errors && result.data.data.taggingDeleteTagFromEntity.errors.length >0) {
                log(`${SYMBOLS.error} - ${entities[idx].guid} Deleting Tag did not work ${JSON.stringify(result.data.data.taggingDeleteTagFromEntity.errors)}`, 'error');
                entities[idx]["Error"] = true;
            }
            else {count++;entities[idx]["Error"]=false;}
        });
        if(count > 0) {
            log(`${SYMBOLS.success} Success Deleting ${TAG_KEY_TO_ADD} Tag for ${count} entities!!!`);
            fs.writeFileSync('entities_tags_deleted.json', JSON.stringify(entities));
        }
    } catch(error){
        log(`${SYMBOLS.error} Exception Deleting Tags did not work  ${JSON.stringify(error)}`, 'error')
    }    
}