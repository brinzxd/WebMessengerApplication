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
    req.setSender(sender);
    req.setReceiver(receiver);
    return friendRequestRepository.save(req);
  }

  @Transactional
  public void respondToRequest(Long requestId, Long userId, boolean accept) {
    FriendRequest req = friendRequestRepository.findById(requestId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
    if (!req.getReceiver().getId().equals(userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    if (accept) {
      req.setStatus(FriendRequest.Status.ACCEPTED);
      Friendship f = new Friendship();
      f.setUser1(req.getSender());
      f.setUser2(req.getReceiver());
      friendshipRepository.save(f);
    } else {
      req.setStatus(FriendRequest.Status.DECLINED);
    }
    friendRequestRepository.save(req);
  }

  public List<FriendRequest> getPendingRequests(Long userId) {
    return friendRequestRepository.findByReceiverIdAndStatus(userId, FriendRequest.Status.PENDING);
  }

  public List<Friendship> getFriends(Long userId) {
    return friendshipRepository.findAllByUserId(userId);
  }

  @Transactional
  public void removeFriend(Long userId, Long friendId) {
    Friendship f = friendshipRepository.findBetween(userId, friendId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship not found"));
    friendshipRepository.delete(f);
  }
}
