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
        bytes32 txHash;  // Transaction hash for reference
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

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice Logs a token transfer event immutably
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
    function getTransferRecord(uint256 index) external view returns (TransferRecord memory) {
        require(index < transferRecords.length, "Index out of bounds");
        return transferRecords[index];
    }

    /// @notice Returns all transfers involving the specified address
    /// @param user The address to filter transfers by
    function getTransfersByAddress(address user) external view returns (TransferRecord[] memory) {
        uint256 count = 0;

        // First loop: count matching records
        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == user || transferRecords[i].to == user) {
                count++;
            }
        }

        // Allocate memory
        TransferRecord[] memory result = new TransferRecord[](count);
        uint256 index = 0;

        // Second loop: populate result array
        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == user || transferRecords[i].to == user) {
                result[index] = transferRecords[i];
                index++;
            }
        }

        return result;
    }
}
