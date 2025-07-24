// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title TokenAuditTrail
/// @notice Records all token transfer events immutably for compliance and audit purposes.
/// @dev This contract tracks transfers of an ERC20-like token and stores an immutable log of each transaction.
contract TokenAuditTrail {

    address public admin;

    struct TransferRecord {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
    }

    // Array to store all transfer records immutably
    TransferRecord[] public transferRecords;

    // Event emitted on every token transfer logged
    event TransferLogged(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp,
        bytes32 txHash
    );

    // Optional event when a record is deleted
    event TransferRecordDeleted(uint256 index);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice Logs a token transfer event immutably
    /// @param from Address tokens sent from
    /// @param to Address tokens sent to
    /// @param amount Number of tokens transferred
    /// @param txHash The hash of the original token transfer transaction
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
    /// @return matchedTransfers Array of TransferRecord where the address was involved
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
    /// @return latestRecord The latest TransferRecord
    function getLatestTransfer() external view returns (TransferRecord memory latestRecord) {
        require(transferRecords.length > 0, "No transfers recorded");
        return transferRecords[transferRecords.length - 1];
    }

    /// @notice Deletes a transfer record at a specific index (Admin only)
    /// @param index The index of the transfer record to delete
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
}
