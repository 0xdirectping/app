// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SimpleEscrowV3 {
    enum Status { Open, Accepted, Completed, Cancelled, Disputed }

    struct Quest {
        address creator;
        address worker;
        uint256 amount;
        string description;
        uint256 deadline;
        Status status;
        address token; // address(0) = ETH, USDC address = USDC
    }

    struct Agent {
        string handle;
        string description;
        uint256 registeredAt;
    }

    address public owner;
    uint256 public platformFeeBps = 100; // 1% default
    uint256 public constant MAX_FEE_BPS = 1000; // 10% cap
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    uint256 public accumulatedFeesETH;
    uint256 public accumulatedFeesUSDC;

    uint256 public questCount;
    mapping(uint256 => Quest) public quests;

    uint256 public agentCount;
    mapping(address => Agent) public agents;
    mapping(uint256 => address) public agentByIndex;

    event QuestCreated(uint256 indexed questId, address indexed creator, uint256 amount, string description, uint256 deadline, address token);
    event QuestAccepted(uint256 indexed questId, address indexed worker);
    event QuestCompleted(uint256 indexed questId, address indexed worker, uint256 amount);
    event QuestCancelled(uint256 indexed questId);
    event QuestDisputed(uint256 indexed questId, address indexed disputedBy);
    event DisputeResolved(uint256 indexed questId, address indexed recipient, uint256 amount);
    event ExpiredRefund(uint256 indexed questId, address indexed creator, uint256 amount);
    event AgentRegistered(address indexed agentAddress, string handle);
    event FeesWithdrawn(address indexed to, uint256 ethAmount, uint256 usdcAmount);
    event FeeUpdated(uint256 oldBps, uint256 newBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // --- Fee management ---

    function setFeeBps(uint256 _newBps) external onlyOwner {
        require(_newBps <= MAX_FEE_BPS, "Fee exceeds max");
        uint256 oldBps = platformFeeBps;
        platformFeeBps = _newBps;
        emit FeeUpdated(oldBps, _newBps);
    }

    // --- Quest functions ---

    function createQuest(string calldata _description, uint256 _deadline, address _token, uint256 _amount) external payable returns (uint256) {
        require(_deadline > block.timestamp, "Deadline must be in the future");

        if (_token == address(0)) {
            // ETH quest
            require(msg.value > 0, "Must send ETH as bounty");
            _amount = msg.value;
        } else if (_token == USDC) {
            // USDC quest
            require(_amount > 0, "Must specify USDC amount");
            require(msg.value == 0, "Do not send ETH for USDC quest");
            require(IERC20(USDC).transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");
        } else {
            revert("Unsupported token");
        }

        uint256 questId = questCount++;
        quests[questId] = Quest({
            creator: msg.sender,
            worker: address(0),
            amount: _amount,
            description: _description,
            deadline: _deadline,
            status: Status.Open,
            token: _token
        });

        emit QuestCreated(questId, msg.sender, _amount, _description, _deadline, _token);
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

        uint256 fee = (quest.amount * platformFeeBps) / 10000;
        uint256 payout = quest.amount - fee;

        if (quest.token == address(0)) {
            accumulatedFeesETH += fee;
        } else {
            accumulatedFeesUSDC += fee;
        }

        _sendFunds(quest.token, quest.worker, payout);

        emit QuestCompleted(_questId, quest.worker, payout);
    }

    function cancelQuest(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Open, "Can only cancel open quests");
        require(quest.creator == msg.sender, "Only creator can cancel");

        quest.status = Status.Cancelled;

        _sendFunds(quest.token, quest.creator, quest.amount);

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

        uint256 fee = (quest.amount * platformFeeBps) / 10000;
        uint256 payout = quest.amount - fee;

        if (quest.token == address(0)) {
            accumulatedFeesETH += fee;
        } else {
            accumulatedFeesUSDC += fee;
        }

        _sendFunds(quest.token, _recipient, payout);

        emit DisputeResolved(_questId, _recipient, payout);
    }

    // --- Deadline refund ---

    function claimExpiredRefund(uint256 _questId) external {
        Quest storage quest = quests[_questId];
        require(quest.status == Status.Open, "Quest not open");
        require(block.timestamp >= quest.deadline, "Quest not expired yet");

        quest.status = Status.Cancelled;

        _sendFunds(quest.token, quest.creator, quest.amount);

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
        uint256 ethAmount = accumulatedFeesETH;
        uint256 usdcAmount = accumulatedFeesUSDC;
        require(ethAmount > 0 || usdcAmount > 0, "No fees to withdraw");

        accumulatedFeesETH = 0;
        accumulatedFeesUSDC = 0;

        if (ethAmount > 0) {
            (bool sent, ) = owner.call{value: ethAmount}("");
            require(sent, "Failed to withdraw ETH");
        }

        if (usdcAmount > 0) {
            require(IERC20(USDC).transfer(owner, usdcAmount), "Failed to withdraw USDC");
        }

        emit FeesWithdrawn(owner, ethAmount, usdcAmount);
    }

    // --- Internal ---

    function _sendFunds(address _token, address _to, uint256 _amount) internal {
        if (_token == address(0)) {
            (bool sent, ) = _to.call{value: _amount}("");
            require(sent, "Failed to send ETH");
        } else {
            require(IERC20(_token).transfer(_to, _amount), "Failed to send token");
        }
    }
}
