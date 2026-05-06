package com.webmessenger.friend;

import com.webmessenger.user.User;
import com.webmessenger.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @Transactional
    public FriendRequest sendRequest(Long senderId, String receiverNickname) {
        User receiver = userRepository.findByNickname(receiverNickname)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (receiver.getId().equals(senderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot add yourself");
        }
        if (friendshipRepository.existsBetween(senderId, receiver.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already friends");
        }
        if (friendRequestRepository.findPendingBetween(senderId, receiver.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Request already pending");
        }
        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sender not found"));
        FriendRequest req = new FriendRequest();
        req.setFromUser(sender);
        req.setToUser(receiver);
        req.setStatus(FriendRequest.Status.PENDING);
        return friendRequestRepository.save(req);
    }

    @Transactional
    public void respondToRequest(Long requestId, Long userId, boolean accept) {
        FriendRequest req = friendRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!req.getToUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (accept) {
            req.setStatus(FriendRequest.Status.ACCEPTED);
            Friendship fs = new Friendship();
            fs.setUser1(req.getFromUser());
            fs.setUser2(req.getToUser());
            friendshipRepository.save(fs);
        } else {
            req.setStatus(FriendRequest.Status.DECLINED);
        }
        friendRequestRepository.save(req);
    }

    public List<FriendRequest> getIncomingRequests(Long userId) {
        return friendRequestRepository.findPendingForUser(userId);
    }

    public List<FriendRequest> getSentRequests(Long userId) {
        return friendRequestRepository.findSentByUser(userId);
    }

    public List<Friendship> getFriends(Long userId) {
        return friendshipRepository.findByUserId(userId);
    }

    @Transactional
    public void removeFriend(Long friendshipId, Long userId) {
        Friendship fs = friendshipRepository.findById(friendshipId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!fs.getUser1().getId().equals(userId) && !fs.getUser2().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        friendshipRepository.delete(fs);
    }
}
