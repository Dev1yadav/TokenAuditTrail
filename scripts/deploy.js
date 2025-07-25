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

    function getTransferCount() external view returns (uint256) {
        return transferRecords.length;
    }

    function getTransferRecord(uint256 index) external view returns (TransferRecord memory) {
        require(index < transferRecords.length, "Index out of bounds");
        return transferRecords[index];
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice Returns all transfer records made by a specific sender
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
}
