// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title TokenAuditTrail
/// @notice Records all token transfer events immutably for compliance and audit purposes.
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

    // Event emitted when admin is changed
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

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

    /// @notice Allows the current admin to transfer admin rights to another address
    /// @param newAdmin The address of the new admin
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }
}
