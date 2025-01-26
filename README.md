## Prerequisites
[docker](https://www.docker.com/) (18.03 or newer) environment

## Getting Started    


#### Build the minifabric image locally

```
docker build -t hyperledgerlabs/minifab:latest . --platform linux/arm64
```
### 2. Stand up a fabric network:

#### 2.1 Bring up complete network with default settings
```
minifab up
```
or 
```
./minifab up -i 2.5 -l go
```

#### 2.2 Bring up partial network with custom settings
```
./minifab netup -e 7100 -o org0.example.com -i 2.5 -l go -s couchdb
```

### 3. Create/Join a chaincode (Optional: Only execute if you executed 2.2):
```
./minifab create,join -c channel1
```

### 4. Install and Deploy a chaincode:(Optional: Only execute if you executed 2.2):
```
./minifab install,approve,commit -n simple -l go -v 1.0
```

```
./minifab anchorupdate
```

### 5. Profile generation: (Optional: Only execute if you executed 2.2):
 ```
 ./minifab profilegen
 ```


### 6. Copy the profile file:

Copy the profile file to your application directory
```
from: ~/.vars/profiles/{channel-name}_connection_for_nodesdk.json
```
```
to: app/node/connection.json
```

### 6. Run the application

#### 6.1 Run Messaging Queue First

```
chmod +x startmessageQueue.sh
./startmessageQueue.sh
```

#### 6.2 Run the Watch Events script
```
cd app/node
```
```
npm run watch-events
```

#### 6.3 Run the Queue consumer

```
npm run events-consumer
```

#### 6.4 Run the execute-txs.js
Run this command After setting up all the setup of Hyperledger Fabric and Ethermint
```
node execute-txs.js
```

### 3. Tear down the fabric network and cleanup everything:
```
minifab cleanup
```