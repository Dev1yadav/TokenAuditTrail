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
        bytes32 txHash;
    }

    TransferRecord[] public transferRecords;

    event TransferLogged(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp,
        bytes32 txHash
    );

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// @notice Logs a transfer with metadata
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

    /// @notice Returns the total number of transfer records
    function getTransferCount() external view returns (uint256) {
        return transferRecords.length;
    }

    /// @notice Returns the transfer record at a specific index
    function getTransferRecord(uint256 index) external view returns (TransferRecord memory) {
        require(index < transferRecords.length, "Index out of bounds");
        return transferRecords[index];
    }

    /// @notice Allows the current admin to assign a new admin
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice Returns all transfer records sent by a specific sender
    function getTransfersBySender(address sender) external view returns (TransferRecord[] memory records) {
        uint256 count = 0;
        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == sender) {
                count++;
            }
        }

        records = new TransferRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == sender) {
                records[index] = transferRecords[i];
                index++;
            }
        }
    }

    /// @notice Returns all transfer records received by a specific receiver
    function getTransfersByReceiver(address receiver) external view returns (TransferRecord[] memory records) {
        uint256 count = 0;
        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].to == receiver) {
                count++;
            }
        }

        records = new TransferRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].to == receiver) {
                records[index] = transferRecords[i];
                index++;
            }
        }
    }

    /// @notice Returns the transfer record matching a specific transaction hash
    function getTransferByTxHash(bytes32 txHash) external view returns (TransferRecord memory) {
        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].txHash == txHash) {
                return transferRecords[i];
            }
        }
        revert("Transaction hash not found");
    }
}
