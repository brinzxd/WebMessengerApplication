package com.webmessenger.friend;

import com.webmessenger.presence.PresenceService;
import com.webmessenger.user.User;
import com.webmessenger.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final PresenceService presenceService;

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

    public List<FriendRequestDto> getIncomingRequests(Long userId) {
        return friendRequestRepository.findPendingForUser(userId).stream()
                .map(r -> new FriendRequestDto(
                        r.getId(),
                        r.getFromUser().getId(),
                        r.getFromUser().getNickname(),
                        r.getFromUser().getAvatarUrl(),
                        r.getCreatedAt()))
                .collect(Collectors.toList());
    }

    public List<FriendRequestDto> getSentRequests(Long userId) {
        return friendRequestRepository.findSentByUser(userId).stream()
                .map(r -> new FriendRequestDto(
                        r.getId(),
                        r.getFromUser().getId(),
                        r.getFromUser().getNickname(),
                        r.getFromUser().getAvatarUrl(),
                        r.getCreatedAt()))
                .collect(Collectors.toList());
    }

    public List<FriendDto> getFriends(Long userId) {
        return friendshipRepository.findByUserId(userId).stream()
                .map(fs -> {
                    User friend = fs.getUser1().getId().equals(userId) ? fs.getUser2() : fs.getUser1();
                    PresenceService.PresenceStatus status = presenceService.getStatus(friend.getId());
                    return new FriendDto(
                            fs.getId(),
                            friend.getId(),
                            friend.getNickname(),
                            friend.getAvatarUrl(),
                            status.online(),
                            status.lastSeen());
                })
                .collect(Collectors.toList());
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
