// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title TokenAuditTrail
/// @notice Records all token transfer events immutably for compliance and audit purposes.
contract TokenAuditTrail {
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
    }

    TransferRecord[] public transferRecords;

    event TransferLogged(address indexed from, address indexed to, uint256 amount, uint256 timestamp, bytes32 txHash);
    event TransferRecordDeleted(uint256 indexed index);

    /// @notice Logs a new token transfer record
    function logTransfer(address from, address to, uint256 amount, bytes32 txHash) external onlyAdmin {
        TransferRecord memory record = TransferRecord({
            from: from,
            to: to,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash
        });
        transferRecords.push(record);

        emit TransferLogged(from, to, amount, block.timestamp, txHash);
    }

    /// @notice Returns the total number of transfer records stored
    function getTransferCount() external view returns (uint256) {
        return transferRecords.length;
    }

    /// @notice Returns a transfer record at a specific index
    /// @param index The index of the transfer record
    function getTransferRecord(uint256 index) external view returns (TransferRecord memory) {
        require(index < transferRecords.length, "Index out of bounds");
        return transferRecords[index];
    }

    /// @notice Get all transfers involving a specific address
    /// @param user Address to filter transfers by
    function getTransfersByAddress(address user) external view returns (TransferRecord[] memory matchedTransfers) {
        uint count = 0;

        // First pass: count how many records match
        for (uint i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == user || transferRecords[i].to == user) {
                count++;
            }
        }

        // Allocate memory for result array
        matchedTransfers = new TransferRecord[](count);
        uint index = 0;

        // Second pass: fill the result array
        for (uint i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == user || transferRecords[i].to == user) {
                matchedTransfers[index] = transferRecords[i];
                index++;
            }
        }
    }

    /// @notice Returns the most recent transfer record
    function getLatestTransfer() external view returns (TransferRecord memory latestRecord) {
        require(transferRecords.length > 0, "No transfers recorded");
        return transferRecords[transferRecords.length - 1];
    }

    /// @notice Deletes a transfer record at a specific index (Admin only)
    function deleteTransferRecord(uint256 index) external onlyAdmin {
        require(index < transferRecords.length, "Index out of bounds");

        // Shift all records after the index to fill the gap
        for (uint i = index; i < transferRecords.length - 1; i++) {
            transferRecords[i] = transferRecords[i + 1];
        }

        // Remove the last record
        transferRecords.pop();

        emit TransferRecordDeleted(index);
    }

    /// @notice Get all transfers that occurred within a specific time range
    /// @param startTime The start timestamp (inclusive)
    /// @param endTime The end timestamp (inclusive)
    function getTransfersInTimeRange(uint256 startTime, uint256 endTime) external view returns (TransferRecord[] memory timeFilteredTransfers) {
        require(startTime <= endTime, "Invalid time range");

        uint count = 0;

        // First pass: count how many records match the time range
        for (uint i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].timestamp >= startTime && transferRecords[i].timestamp <= endTime) {
                count++;
            }
        }

        // Allocate memory
        timeFilteredTransfers = new TransferRecord[](count);
        uint index = 0;

        // Second pass: collect matching records
        for (uint i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].timestamp >= startTime && transferRecords[i].timestamp <= endTime) {
                timeFilteredTransfers[index] = transferRecords[i];
                index++;
            }
        }
    }

    /// @notice Returns a transfer record by its transaction hash
    /// @param hash The transaction hash to search for
    function getTransferByTxHash(bytes32 hash) external view returns (TransferRecord memory record, bool found) {
        for (uint i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].txHash == hash) {
                return (transferRecords[i], true);
            }
        }
        // Return empty struct and false if not found
        return (TransferRecord(address(0), address(0), 0, 0, 0), false);
    }
}
