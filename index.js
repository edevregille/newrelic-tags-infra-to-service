require('dotenv').config();

const {fetchEntities, fetchInfraAWSTag, addEntitiesTag, deleteEntitiesTag} = require('./utils');

//------------------------------
const TAG_KEY = ["aws.awsRegion", "awsRegion"]; // same tag can have multiple keys
const TAG_KEY_TO_ADD = "server_region";
const NR_ACCOUNT_ID = 01234;
//------------------------------

const runToAddTags = async() => {
    let entities = await fetchEntities(action = "addTags", NR_ACCOUNT_ID);
    entities = await fetchInfraAWSTag(entities, TAG_KEY);
    await addEntitiesTag(entities, TAG_KEY_TO_ADD);
}

const runToDeleteTags = async() => {
    const entities = await fetchEntities(action = "deleteTags", NR_ACCOUNT_ID, TAG_KEY_TO_ADD);
    await deleteEntitiesTag(entities, TAG_KEY_TO_ADD);
}

runToAddTags();
//runToDeleteTags();