// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleEscrowV2 {
    enum Status { Open, Accepted, Completed, Cancelled, Disputed }

    struct Quest {
        address creator;
        address worker;
        uint256 amount;
        string description;
        uint256 deadline;
        Status status;
    }

    struct Agent {
        string handle;
        string description;
        uint256 registeredAt;
    }

    address public owner;
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    uint256 public accumulatedFees;

    uint256 public questCount;
    mapping(uint256 => Quest) public quests;

    uint256 public agentCount;
    mapping(address => Agent) public agents;
    mapping(uint256 => address) public agentByIndex;

    event QuestCreated(uint256 indexed questId, address indexed creator, uint256 amount, string description, uint256 deadline);
    event QuestAccepted(uint256 indexed questId, address indexed worker);
    event QuestCompleted(uint256 indexed questId, address indexed worker, uint256 amount);
    event QuestCancelled(uint256 indexed questId);
    event QuestDisputed(uint256 indexed questId, address indexed disputedBy);
    event DisputeResolved(uint256 indexed questId, address indexed recipient, uint256 amount);
    event ExpiredRefund(uint256 indexed questId, address indexed creator, uint256 amount);
    event AgentRegistered(address indexed agentAddress, string handle);
    event FeesWithdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createQuest(string calldata _description, uint256 _deadline) external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH as bounty");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        uint256 questId = questCount++;
        quests[questId] = Quest({
            creator: msg.sender,
            worker: address(0),
            amount: msg.value,
            description: _description,
            deadline: _deadline,
            status: Status.Open
        });

        emit QuestCreated(questId, msg.sender, msg.value, _description, _deadline);
        return questId;
    }

    function acceptQuest(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Open, "Quest not open");
        require(quest.creator != msg.sender, "Creator cannot accept own quest");
        require(block.timestamp < quest.deadline, "Quest expired");

        quest.worker = msg.sender;
        quest.status = Status.Accepted;

        emit QuestAccepted(_questId, msg.sender);
    }

    function completeQuest(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Accepted, "Quest not accepted");
        require(quest.creator == msg.sender, "Only creator can complete");

        quest.status = Status.Completed;

        uint256 fee = (quest.amount * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = quest.amount - fee;
        accumulatedFees += fee;

        (bool sent, ) = quest.worker.call{value: payout}("");
        require(sent, "Failed to send ETH");

        emit QuestCompleted(_questId, quest.worker, payout);
    }

    function cancelQuest(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Open, "Can only cancel open quests");
        require(quest.creator == msg.sender, "Only creator can cancel");

        quest.status = Status.Cancelled;

        (bool sent, ) = quest.creator.call{value: quest.amount}("");
        require(sent, "Failed to refund ETH");

        emit QuestCancelled(_questId);
    }

    // --- Dispute system ---

    function openDispute(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Accepted, "Can only dispute accepted quests");
        require(
            msg.sender == quest.creator || msg.sender == quest.worker,
            "Only creator or worker can dispute"
        );

        quest.status = Status.Disputed;

        emit QuestDisputed(_questId, msg.sender);
    }

    function resolveDispute(uint256 _questId, address _recipient) external onlyOwner {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Disputed, "Quest not disputed");
        require(
            _recipient == quest.creator || _recipient == quest.worker,
            "Recipient must be creator or worker"
        );

        quest.status = Status.Completed;

        uint256 fee = (quest.amount * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = quest.amount - fee;
        accumulatedFees += fee;

        (bool sent, ) = _recipient.call{value: payout}("");
        require(sent, "Failed to send ETH");

        emit DisputeResolved(_questId, _recipient, payout);
    }

    // --- Deadline refund ---

    function claimExpiredRefund(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Open, "Quest not open");
        require(block.timestamp >= quest.deadline, "Quest not expired yet");

        quest.status = Status.Cancelled;

        (bool sent, ) = quest.creator.call{value: quest.amount}("");
        require(sent, "Failed to refund ETH");

        emit ExpiredRefund(_questId, quest.creator, quest.amount);
    }

    // --- Agent registry ---

    function registerAgent(string calldata _handle, string calldata _description) external {
        require(bytes(_handle).length > 0, "Handle required");
        require(bytes(agents[msg.sender].handle).length == 0, "Already registered");

        agents[msg.sender] = Agent({
            handle: _handle,
            description: _description,
            registeredAt: block.timestamp
        });
        agentByIndex[agentCount] = msg.sender;
        agentCount++;

        emit AgentRegistered(msg.sender, _handle);
    }

    function getAgent(address _addr) external view returns (Agent memory) {
        return agents[_addr];
    }

    // --- Views ---

    function getQuest(uint256 _questId) external view returns (Quest memory) {
        return quests[_questId];
    }

    // --- Fee withdrawal ---

    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;

        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Failed to withdraw");

        emit FeesWithdrawn(owner, amount);
    }
}
