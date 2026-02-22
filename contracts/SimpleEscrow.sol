// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleEscrow {
    enum Status { Open, Accepted, Completed, Cancelled }

    struct Quest {
        address creator;
        address worker;
        uint256 amount;
        string description;
        uint256 deadline;
        Status status;
    }

    uint256 public questCount;
    mapping(uint256 => Quest) public quests;

    event QuestCreated(uint256 indexed questId, address indexed creator, uint256 amount, string description, uint256 deadline);
    event QuestAccepted(uint256 indexed questId, address indexed worker);
    event QuestCompleted(uint256 indexed questId, address indexed worker, uint256 amount);
    event QuestCancelled(uint256 indexed questId);

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

        (bool sent, ) = quest.worker.call{value: quest.amount}("");
        require(sent, "Failed to send ETH");

        emit QuestCompleted(_questId, quest.worker, quest.amount);
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

    function getQuest(uint256 _questId) external view returns (Quest memory) {
        return quests[_questId];
    }
}
