
// --- GRAPHQL QUERIES ----

exports.FETCH_ENTITIES_QUERY = (nextCursor, searchQuery) => { return `{
    actor {
      entitySearch(query: "${searchQuery}") {
        results ${nextCursor ? `(cursor: "${nextCursor}")` : ''} {
          nextCursor
          entities {
            name
            guid
          }
        }
      }
    }
  }`
};

exports.FETCH_HOSTS_TAGS = (guid) => { return `
{
    actor {
      entity(guid: "${guid}") {
        relatedEntities(filter: {relationshipTypes: {include: HOSTS}}) {
          results {
            source {
              entity {
                ... on InfrastructureHostEntityOutline {
                  name
                  tags {
                    key
                    values
                  }
                }
              }
            }
          }
        }
      }
    }
  }`
};

exports.ADD_TAG_TO_ENTITY_QUERY = (guid, values, TAG_KEY_TO_ADD ) => {
    return `mutation{
        taggingReplaceTagsOnEntity(tags: {key: "${TAG_KEY_TO_ADD}", values: ${JSON.stringify(values)}}, guid: "${guid}") {
            errors {
                message
                type
            }
        }}`
};

exports.DELETE_TAG_TO_ENTITY_QUERY = (guid, TAG_KEY_TO_ADD) => {return `
    mutation {
        taggingDeleteTagFromEntity(guid: "${guid}", tagKeys: "${TAG_KEY_TO_ADD}") {
            errors {
            message
            }
        }
    }
`}