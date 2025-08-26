// SPD X-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title TokenAuditTrail
/// @notice Records all token transfer events immutably for compliance and audit purposes.
/// @dev Storage can be edited by admin (e.g., delete), but emitted events are immutable on-chain.
contract TokenAuditTrail {
    // --- Admin ---
    address public admin;

    // --- State ---
    bool public paused;

    struct TransferRecord {
        address  from;
        address to;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
    }

    TransferRecord[] public transferRecords;

    /// @dev Maps txHash => index+1 in transferRecords for O(1) lookup. 0 means "not present".
    mapping(bytes32 => uint256) private txIndexPlusOne;

    /// @dev Simple aggregates for analytics
    mapping(address => uint256) public totalSentBy;
    mapping(address => uint256) public totalReceivedBy;

    // --- Events ---
    event TransferLogged(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp,
        bytes32 indexed txHash
    );

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event TransferRecordDeleted(uint256 indexed deletedIndex, bytes32 indexed txHash, address indexed by);

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    // --- Constructor ---
    constructor() {
        admin = msg.sender;
    }

    // --- Admin Controls ---
    /// @notice Allows the current admin to assign a new admin
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    /// @notice Pause logging (emergency stop)
    function pause() external onlyAdmin {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Resume logging
    function unpause() external onlyAdmin {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    // --- Core ---
    /// @notice Logs a transfer with metadata (admin-only)
    function logTransfer(
        address from,
        address to,
        uint256 amount,
        bytes32 txHash
    ) external onlyAdmin whenNotPaused {
        require(from != address(0) && to != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");
        require(txHash != bytes32(0), "Empty txHash");
        require(txIndexPlusOne[txHash] == 0, "txHash already logged");

        TransferRecord memory record = TransferRecord({
            from: from,
            to: to,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash
        });

        transferRecords.push(record);
        // Store index+1
        txIndexPlusOne[txHash] = transferRecords.length;

        // Update aggregates
        totalSentBy[from] += amount;
        totalReceivedBy[to] += amount;

        emit TransferLogged(from, to, amount, block.timestamp, txHash);
    }

    /// @notice Deletes a transfer record at a given index (admin only).
    /// @dev Swaps with the last element to keep array compact, updates indices and aggregates.
    function deleteTransferRecord(uint256 index) external onlyAdmin {
        require(index < transferRecords.length, "Index out of bounds");

        // Record to delete
        TransferRecord memory toDelete = transferRecords[index];

        // Adjust aggregates
        if (totalSentBy[toDelete.from] >= toDelete.amount) {
            totalSentBy[toDelete.from] -= toDelete.amount;
        } else {
            totalSentBy[toDelete.from] = 0;
        }

        if (totalReceivedBy[toDelete.to] >= toDelete.amount) {
            totalReceivedBy[toDelete.to] -= toDelete.amount;
        } else {
            totalReceivedBy[toDelete.to] = 0;
        }

        // Remove mapping entry for the deleted txHash
        uint256 lastIdx = transferRecords.length - 1;
        bytes32 deletedHash = toDelete.txHash;
        delete txIndexPlusOne[deletedHash];

        if (index != lastIdx) {
            // Move last record to the deletion spot
            TransferRecord memory lastRecord = transferRecords[lastIdx];
            transferRecords[index] = lastRecord;

            // Update moved record's index in mapping
            txIndexPlusOne[lastRecord.txHash] = index + 1; // store index+1
        }

        // Pop last
        transferRecords.pop();

        emit TransferRecordDeleted(index, deletedHash, msg.sender);
    }

    // --- Views: Counts, Records, Filters ---
    /// @notice Returns the total number of transfer records
    function getTransferCount() external view returns (uint256) {
        return transferRecords.length;
    }

    /// @notice Returns the transfer record at a specific index
    function getTransferRecord(uint256 index) external view returns (TransferRecord memory) {
        require(index < transferRecords.length, "Index out of bounds");
        return transferRecords[index];
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
        uint256 idx = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].from == sender) {
                records[idx] = transferRecords[i];
                idx++;
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
        uint256 idx = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].to == receiver) {
                records[idx] = transferRecords[i];
                idx++;
            }
        }
    }

    /// @notice Returns a transfer record matching a specific transaction hash (O(1))
    function getTransferByTxHash(bytes32 txHash) external view returns (TransferRecord memory) {
        uint256 idxPlusOne = txIndexPlusOne[txHash];
        if (idxPlusOne == 0) revert("Transaction hash not found");
        return transferRecords[idxPlusOne - 1];
    }

    /// @notice Pagination: fetch a slice of transfer records
    /// @param offset starting index
    /// @param limit number of records to return
    function getTransferRecords(uint256 offset, uint256 limit) external view returns (TransferRecord[] memory) {
        require(offset <= transferRecords.length, "Offset out of bounds");
        uint256 end = offset + limit;
        if (end > transferRecords.length) {
            end = transferRecords.length;
        }
        uint256 size = end > offset ? end - offset : 0;

        TransferRecord[] memory slice = new TransferRecord[](size);
        for (uint256 i = 0; i < size; i++) {
            slice[i] = transferRecords[offset + i];
        }
        return slice;
    }
        }        for (uint256 i = 0; i < transferRecords.length; i++) {
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
