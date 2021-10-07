The script pulls a tag from Infrastructure agent across all EC2s on which a service is running to add it to the service.

The script runs at the account level.

1/ Install node dependencies:

```npm install```

2/ Add New Relic License Key

Create a .env file with following content (you can get your key here: https://onenr.io/0Zyw4qZoVR3)

```NEWRELIC_USER_API_KEY=USER_API_KEY```

3/ Set the values in the `index.js` file:

```
const TAG_KEY = "TAG_KEY_TARGET_FROM_INFRA"; // aws.awsRegion, aws.availabilityZone etc...
const TAG_KEY_TO_ADD = "TAG_KEY_SHOWING_SERVICE"; // tag key as it will show on service
const NR_ACCOUNT_ID = 01234 ; // nr account ID 
```

4/ choose if you want to add or delete the Tag