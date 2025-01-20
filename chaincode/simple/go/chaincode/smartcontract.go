package chaincode

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// Smart contract
type SmartContract struct {
	contractapi.Contract
}

// Device represents an IoT device
type Device struct {
	ID       string `json:"id"`
	Owner    string `json:"owner"`
	Location string `json:"location"`
	Status   string `json:"status"` // e.g., active, inactive
}

// DataRecord represents IoT data from a device
type DataRecord struct {
	DeviceID       string `json:"deviceID"`
	Timestamp      string `json:"timestamp"`      // Time of data submission
	DataHash       string `json:"dataHash"`       // SHA-256 hash of data
	Status         string `json:"status"`         // e.g., pending, verified, rejected
	ValidationTime string `json:"validationTime"` // Time of validation or rejection
}

const (
	MAX_VALIDATIONS = 3
)

// RegisterDevice registers a new IoT device on the ledger
func (s *SmartContract) RegisterDevice(ctx contractapi.TransactionContextInterface, deviceID string, owner string, location string) error {
	// Check if device already exists
	exists, err := s.DeviceExists(ctx, deviceID)
	if err != nil {
		return fmt.Errorf("failed to check device existence: %v", err)
	}
	if exists {
		return fmt.Errorf("device %s already registered", deviceID)
	}

	// Create new device
	device := Device{
		ID:       deviceID,
		Owner:    owner,
		Location: location,
		Status:   "active",
	}

	// Marshal device data and save to ledger
	deviceJSON, err := json.Marshal(device)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(deviceID, deviceJSON)
	if err != nil {
		return err
	}

	// Emit event for device registration
	eventPayload := map[string]string{"deviceID": deviceID, "owner": owner, "location": location}
	eventJSON, _ := json.Marshal(eventPayload)
	return ctx.GetStub().SetEvent("DeviceRegistered", eventJSON)

}

// DeviceExists checks if a device exists on the ledger
func (s *SmartContract) DeviceExists(ctx contractapi.TransactionContextInterface, deviceID string) (bool, error) {
	deviceJSON, err := ctx.GetStub().GetState(deviceID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return deviceJSON != nil, nil
}

// Function to generate a unique DataID
func GenerateDataID(deviceID string, dataHash string, timestamp string) (string, error) {
	// Combine deviceID, dataHash, and timestamp into a single string
	combined := fmt.Sprintf("%s:%s:%s", deviceID, dataHash, timestamp)

	// Compute the SHA-256 hash of the combined string
	hash := sha256.New()
	_, err := hash.Write([]byte(combined))
	if err != nil {
		return "", fmt.Errorf("failed to generate data ID: %v", err)
	}

	// Return the hexadecimal representation of the hash as the DataID
	return hex.EncodeToString(hash.Sum(nil)), nil
}

// SubmitData allows an IoT device to submit data to the ledger
func (s *SmartContract) SubmitData(ctx contractapi.TransactionContextInterface, deviceID string, dataHash string) error {
	// Ensure device is registered
	exists, err := s.DeviceExists(ctx, deviceID)
	if err != nil {
		return fmt.Errorf("failed to check device existence: %v", err)
	}
	if !exists {
		return fmt.Errorf("device %s not registered", deviceID)
	}

	// Get current timestamp for data submission
	submissionTimestamp := time.Now().Format(time.RFC3339) // Generate a data hash for uniqueness

	dataID, err := GenerateDataID(deviceID, dataHash, submissionTimestamp)
	if err != nil {
		return err
	}

	// Create data record
	dataRecord := DataRecord{
		DeviceID:       deviceID,
		Timestamp:      submissionTimestamp,
		DataHash:       dataHash,
		Status:         "pending",
		ValidationTime: "", // Not yet validated
	}

	// Marshal data record and save to ledger
	dataJSON, err := json.Marshal(dataRecord)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(dataID, dataJSON)
	if err != nil {
		return err
	}

	// Emit event for data submission
	eventPayload := map[string]interface{}{"dataId": dataID, "deviceID": deviceID, "timestamp": submissionTimestamp, "maxValidations": MAX_VALIDATIONS, "currentValidations": 0, "dataHash": dataHash}
	eventJSON, _ := json.Marshal(eventPayload)
	return ctx.GetStub().SetEvent("DataSubmitted", eventJSON)
}

// VerifyData verifies a submitted data record and updates its status
func (s *SmartContract) VerifyData(ctx contractapi.TransactionContextInterface, dataID string, isValid bool) error {
	// Retrieve data record from ledger
	dataJSON, err := ctx.GetStub().GetState(dataID)
	if err != nil {
		return fmt.Errorf("failed to get data record: %v", err)
	}
	if dataJSON == nil {
		return fmt.Errorf("data record for DataId  %s does not exist", dataID)
	}

	// Unmarshal data record
	var dataRecord DataRecord
	err = json.Unmarshal(dataJSON, &dataRecord)
	if err != nil {
		return fmt.Errorf("failed to unmarshal data record: %v", err)
	}

	// Get the current timestamp for validation time
	validationTimestamp := time.Now().Format(time.RFC3339)

	// Update verification status and timestamp
	if isValid {
		dataRecord.Status = "verified"
	} else {
		dataRecord.Status = "rejected"
	}
	dataRecord.ValidationTime = validationTimestamp

	// Marshal updated data record and save to ledger
	updatedDataJSON, err := json.Marshal(dataRecord)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(dataID, updatedDataJSON)
	if err != nil {
		return err
	}

	eventPayload := map[string]string{"dataId": dataID, "validationTimestamp": validationTimestamp, "status": dataRecord.Status}
	eventJSON, _ := json.Marshal(eventPayload)
	return ctx.GetStub().SetEvent("DataVerifyEvent", eventJSON)
}

// GetDevice retrieves a device by its ID
func (s *SmartContract) GetDevice(ctx contractapi.TransactionContextInterface, deviceID string) (*Device, error) {
	deviceJSON, err := ctx.GetStub().GetState(deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to read device: %v", err)
	}
	if deviceJSON == nil {
		return nil, fmt.Errorf("device %s does not exist", deviceID)
	}

	var device Device
	err = json.Unmarshal(deviceJSON, &device)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal device JSON: %v", err)
	}
	return &device, nil
}

// GetDataRecord retrieves a data record by dataID
func (s *SmartContract) GetDataRecord(ctx contractapi.TransactionContextInterface, dataID string) (*DataRecord, error) {
	dataJSON, err := ctx.GetStub().GetState(dataID)
	if err != nil {
		return nil, fmt.Errorf("failed to get data record: %v", err)
	}
	if dataJSON == nil {
		return nil, fmt.Errorf("data record not found")
	}

	var dataRecord DataRecord
	err = json.Unmarshal(dataJSON, &dataRecord)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal data record: %v", err)
	}
	return &dataRecord, nil
}
