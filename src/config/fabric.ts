// Hyperledger Fabric network configuration for HerbionYX
export const FABRIC_CONFIG = {
  CHANNEL_NAME: "herbionyx-channel",
  CHAINCODE_NAME: "herbionyx-chaincode",
  ORG_MSP_ID: "Org1MSP",
  PEER_ENDPOINT: "grpcs://localhost:7051",
  CA_ENDPOINT: "https://localhost:7054",
  ORDERER_ENDPOINT: "grpcs://localhost:7050"
};

export const NETWORK_CONFIG = {
  name: "HerbionYX Hyperledger Fabric Network",
  type: "Hyperledger Fabric",
  version: "2.5.4",
  consensus: "Raft",
  description: "Enterprise-grade permissioned blockchain network for Ayurvedic herb traceability"
};

// Chaincode function names
export const CHAINCODE_FUNCTIONS = {
  CREATE_COLLECTION: "createCollectionEvent",
  CREATE_QUALITY_TEST: "createQualityTestEvent", 
  CREATE_PROCESSING: "createProcessingEvent",
  CREATE_MANUFACTURING: "createManufacturingEvent",
  QUERY_BATCH: "queryBatch",
  GET_BATCH_EVENTS: "getBatchEvents",
  GET_ALL_BATCHES: "getAllBatches",
  QUERY_EVENT: "queryEvent",
  INIT_LEDGER: "initLedger"
};

// Role mappings for Hyperledger Fabric
export const ROLES = {
  NONE: 0,
  COLLECTOR: 1,
  TESTER: 2,
  PROCESSOR: 3,
  MANUFACTURER: 4,
  ADMIN: 5,
  CONSUMER: 6
};

// Fabric network connection profile
export const CONNECTION_PROFILE = {
  name: "herbionyx-network",
  version: "1.0.0",
  client: {
    organization: "Org1",
    connection: {
      timeout: {
        peer: { endorser: "300" },
        orderer: "300"
      }
    }
  },
  organizations: {
    Org1: {
      mspid: "Org1MSP",
      peers: ["peer0.org1.herbionyx.com"],
      certificateAuthorities: ["ca.org1.herbionyx.com"]
    }
  },
  peers: {
    "peer0.org1.herbionyx.com": {
      url: "grpcs://localhost:7051",
      grpcOptions: {
        "ssl-target-name-override": "peer0.org1.herbionyx.com",
        "hostnameOverride": "peer0.org1.herbionyx.com"
      }
    }
  },
  certificateAuthorities: {
    "ca.org1.herbionyx.com": {
      url: "https://localhost:7054",
      caName: "ca.org1.herbionyx.com",
      httpOptions: { verify: false }
    }
  },
  orderers: {
    "orderer.herbionyx.com": {
      url: "grpcs://localhost:7050",
      grpcOptions: {
        "ssl-target-name-override": "orderer.herbionyx.com",
        "hostnameOverride": "orderer.herbionyx.com"
      }
    }
  }
};