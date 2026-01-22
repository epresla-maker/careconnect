'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useServiceFeed } from '@/hooks/useServiceFeed';
import { 
  collection, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  where,
  deleteField
} from 'firebase/firestore';
import { Star, MessageCircle, Share2, Send, MoreHorizontal, X, Heart, Laugh, Frown, Angry, Zap, Image as ImageIcon, ImagePlus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

const REACTIONS = [
  { type: 'like', emoji: '⭐', icon: Star, label: 'Tetszik', color: 'text-yellow-500' },
  { type: 'love', emoji: '❤️', icon: Heart, label: 'Imádom', color: 'text-red-500' },
  { type: 'haha', emoji: '😄', icon: Laugh, label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', emoji: '😮', icon: Zap, label: 'Wow', color: 'text-orange-500' },
  { type: 'sad', emoji: '😢', icon: Frown, label: 'Szomorú', color: 'text-gray-500' },
  { type: 'angry', emoji: '😠', icon: Angry, label: 'Dühös', color: 'text-red-600' }
];

// Rekurzív komment komponens
function CommentItem({ comment, postId, depth = 0, onReply, replyTo, replyText, setReplyText, setReplyTo, userData, user, formatTime }) {
  const maxDepth = 5; // Maximum mélység a fa struktúrában
  const leftMargin = Math.min(depth * 10, 50); // Max 50px balra tolás

  return (
    <div className="space-y-2">
      {/* Komment */}
      <div className="flex gap-2" style={{ marginLeft: `${leftMargin}px` }}>
        {/* Fa vonal */}
        {depth > 0 && (
          <div className="relative">
            <div className="absolute left-0 top-0 w-0.5 h-full bg-gray-300 dark:bg-gray-600 -ml-5"></div>
            <div className="absolute left-0 top-4 w-5 h-0.5 bg-gray-300 dark:bg-gray-600 -ml-5"></div>
          </div>
        )}
        
        <img
          src={comment.userPhoto || '/default-avatar.svg'}
          alt="Commenter"
          className={`${depth === 0 ? 'w-8 h-8' : 'w-7 h-7'} rounded-full object-cover flex-shrink-0`}
        />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
            <p className={`font-semibold ${depth === 0 ? 'text-sm' : 'text-xs'} text-gray-900 dark:text-white`}>
              {comment.userName}
            </p>
            <p className={`${depth === 0 ? 'text-sm' : 'text-xs'} text-gray-900 dark:text-white break-words`}>
              {comment.text}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1 px-2 text-xs text-gray-500">
            <span>{formatTime(comment.createdAt)}</span>
            {depth < maxDepth && (
              <button 
                onClick={() => setReplyTo({ ...replyTo, [`${postId}-${comment.id}`]: !replyTo[`${postId}-${comment.id}`] })}
                className="hover:underline font-semibold text-cyan-600 dark:text-cyan-400"
              >
                Válasz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Válasz Input */}
      {replyTo[`${postId}-${comment.id}`] && (
        <div className="flex gap-2" style={{ marginLeft: `${leftMargin + 10}px` }}>
          <img
            src={userData?.photoURL || user?.photoURL || '/default-avatar.svg'}
            alt="Your avatar"
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 flex gap-2 min-w-0">
            <input
              type="text"
              value={replyText[`${postId}-${comment.id}`] || ''}
              onChange={(e) => setReplyText({ ...replyText, [`${postId}-${comment.id}`]: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && onReply(postId, comment.id)}
              placeholder={`Válasz erre: ${comment.userName}`}
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white text-sm min-w-0"
            />
            <button
              onClick={() => onReply(postId, comment.id)}
              disabled={!replyText[`${postId}-${comment.id}`]?.trim()}
              className="text-cyan-500 hover:text-cyan-600 disabled:text-gray-300 disabled:cursor-not-allowed p-1 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Rekurzív válaszok */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReply={onReply}
              replyTo={replyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              setReplyTo={setReplyTo}
              userData={userData}
              user={user}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModernServiceFeed() {
  // ✅ ÚJ: Optimalizált feed hook használata (onSnapshot helyett)
  const { user, userData } = useAuth();
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    hasNewPosts,
    error,
    refresh,
    loadMore,
    updatePostLocally,
  } = useServiceFeed({ userData });

  // Lokális UI állapotok
  const [newPostText, setNewPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [showReactions, setShowReactions] = useState({});
  const [hoveredReaction, setHoveredReaction] = useState({}); // Melyik emoji van hover alatt
  const [showComments, setShowComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [replyTo, setReplyTo] = useState({});
  const [replyText, setReplyText] = useState({});
  const [pendingReactions, setPendingReactions] = useState({}); // Lokális reakció cache
  const [lightboxImage, setLightboxImage] = useState(null); // Kép modal
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedPostReactions, setSelectedPostReactions] = useState(null);
  
  // Pull to refresh - most már a hook refresh()-ét hívja
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshThreshold = 80;
  
  // Infinite scroll ref
  const loadMoreRef = useRef(null);
  
  const router = useRouter();
  const reactionTimeouts = useRef({});
  const reactionRefs = useRef({});
  const reactionPositions = useRef({}); // Bezier pozíciók tárolása
  const pickerContainerRefs = useRef({}); // Picker container ref-ek

  // ✅ ÚJ: Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // ✅ ÚJ: Pending reakciók alkalmazása a posztokra
  const getPostWithPendingReaction = useCallback((post) => {
    if (!user || pendingReactions[post.id] === undefined) {
      return post;
    }
    
    const reactions = { ...post.reactions };
    if (pendingReactions[post.id] === null) {
      delete reactions[user.uid];
    } else {
      reactions[user.uid] = pendingReactions[post.id];
    }
    
    return { ...post, reactions };
  }, [user, pendingReactions]);

  // Scroll letiltása amikor reakció picker látható
  useEffect(() => {
    const hasActiveReactions = Object.values(showReactions).some(val => val === true);
    
    if (hasActiveReactions) {
      // Letiltjuk a scroll-t
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.touchAction = 'none';
      
      // Globális touchmove esemény letiltása
      const preventScroll = (e) => {
        e.preventDefault();
      };
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        document.removeEventListener('touchmove', preventScroll);
      };
    } else {
      // Visszaállítjuk
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    };
  }, [showReactions]);

  // Pull to refresh kezelés - ✅ MOST MÁR A HOOK REFRESH()-ÉT HÍVJA
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY === 0 && !isRefreshing) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (pullStartY === 0 || isRefreshing) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      
      if (distance > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(distance, refreshThreshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= refreshThreshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(0);
        
        // ✅ ÚJ: Hook refresh() használata az onSnapshot helyett
        await refresh();
        
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      } else {
        setPullDistance(0);
      }
      setPullStartY(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullStartY, pullDistance, isRefreshing, refresh]);

  // ✅ TÖRÖLT: Régi onSnapshot kód eltávolítva - mostantól useServiceFeed hook kezeli

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if ((!newPostText.trim() && !selectedImage) || !user) return;

    try {
      setUploading(true);
      let imageUrl = null;

      // Kép feltöltése Cloudinary-ra ha van
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('userId', user.uid);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Képfeltöltés sikertelen');
        }

        imageUrl = data.url;
      }

      await addDoc(collection(db, 'serviceFeedPosts'), {
        postType: 'userPost',
        userId: user.uid,
        text: newPostText.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        reactions: {},
        comments: [],
        shares: 0
      });
      
      setNewPostText('');
      removeImage();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Hiba történt a poszt létrehozása során: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (postId, reactionType) => {
    if (!user) return;

    const postRef = doc(db, 'serviceFeedPosts', postId);
    const post = posts.find(p => p.id === postId);
    const reactions = post.reactions || {};
    const userReactions = reactions[user.uid];
    
    // Azonnal beállítjuk a pending reakciót (social media stratégia)
    if (userReactions === reactionType) {
      // Töröljük a reakciót
      setPendingReactions(prev => ({ ...prev, [postId]: null }));
    } else {
      // Hozzáadjuk/módosítjuk a reakciót
      setPendingReactions(prev => ({ ...prev, [postId]: reactionType }));
    }

    try {
      const isRemoving = userReactions === reactionType;
      
      if (isRemoving) {
        // Remove reaction using deleteField
        await updateDoc(postRef, {
          [`reactions.${user.uid}`]: deleteField()
        });
      } else {
        // Add/change reaction
        await updateDoc(postRef, {
          [`reactions.${user.uid}`]: reactionType
        });
        
        // Facebook-style activity post létrehozása (csak ha új reakció, nem törlés)
        // Ne hozzon létre activity-t saját poszthoz
        if (post.userId !== user.uid) {
          const reactionLabels = {
            'like': 'tetszik neki',
            'love': 'imádja',
            'haha': 'vicces neki',
            'wow': 'meghökkentette',
            'sad': 'elszomorította',
            'angry': 'feldühítette'
          };
          
          await addDoc(collection(db, 'serviceFeedPosts'), {
            postType: 'reactionActivity',
            userId: user.uid,
            targetPostId: postId,
            targetUserId: post.userId,
            reactionType: reactionType,
            reactionLabel: reactionLabels[reactionType] || 'reagált rá',
            originalPostText: post.text?.substring(0, 100) || '',
            originalPostImage: post.rssImageUrl || null,
            createdAt: serverTimestamp(),
            reactions: {},
            comments: [],
            shares: 0
          });
        }
      }
      
      // Firestore frissítés sikeres - a hook majd frissíti a listát refresh-kor
      // 2 másodperc múlva töröljük a pending-et hogy a Firestore adat érvényesüljön
      setTimeout(() => {
        setPendingReactions(prev => {
          const newPending = { ...prev };
          delete newPending[postId];
          return newPending;
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error updating reaction:', error);
      // Hiba esetén azonnal töröljük a pending reakciót
      setPendingReactions(prev => {
        const newPending = { ...prev };
        delete newPending[postId];
        return newPending;
      });
    }
  };

  const handleComment = async (postId) => {
    if (!commentText[postId]?.trim() || !user) return;

    const postRef = doc(db, 'serviceFeedPosts', postId);
    const newComment = {
      id: Date.now().toString(),
      userId: user.uid,
      userName: userData?.displayName || user.displayName || 'Névtelen',
      userPhoto: userData?.photoURL || user.photoURL,
      text: commentText[postId].trim(),
      createdAt: new Date().toISOString(),
      replies: []
    };

    try {
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });
      setCommentText({ ...commentText, [postId]: '' });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleReply = async (postId, commentId, parentPath = []) => {
    if (!replyText[`${postId}-${commentId}`]?.trim() || !user) return;

    const postRef = doc(db, 'serviceFeedPosts', postId);
    const post = posts.find(p => p.id === postId);
    let comments = [...(post.comments || [])];
    
    const newReply = {
      id: Date.now().toString(),
      userId: user.uid,
      userName: userData?.displayName || user.displayName || 'Névtelen',
      userPhoto: userData?.photoURL || user.photoURL,
      text: replyText[`${postId}-${commentId}`].trim(),
      createdAt: new Date().toISOString(),
      replies: []
    };

    // Rekurzív függvény a megfelelő komment megtalálásához és frissítéséhez
    const addReplyToComment = (commentsList, targetId, reply) => {
      return commentsList.map(comment => {
        if (comment.id === targetId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        } else if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToComment(comment.replies, targetId, reply)
          };
        }
        return comment;
      });
    };

    const updatedComments = addReplyToComment(comments, commentId, newReply);

    try {
      await updateDoc(postRef, {
        comments: updatedComments
      });
      setReplyText({ ...replyText, [`${postId}-${commentId}`]: '' });
      setReplyTo({ ...replyTo, [`${postId}-${commentId}`]: false });
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const getReactionSummary = (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) return null;
    
    const counts = {};
    Object.values(reactions).forEach(type => {
      if (type) counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'most';
    if (diff < 3600) return `${Math.floor(diff / 60)} perce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} órája`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} napja`;
    return date.toLocaleDateString('hu-HU');
  };

  // ✅ ÚJ: Loading state
  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // ✅ ÚJ: Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Hiba történt: {error}</p>
        <button
          onClick={refresh}
          className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
        >
          Újrapróbálás
        </button>
      </div>
    );
  }

  return (
    <div className="w-full divide-y-4 divide-double divide-gray-300 dark:divide-gray-600">

      {/* ✅ ÚJ: New Posts Banner */}
      {hasNewPosts && (
        <div
          onClick={refresh}
          className="sticky top-0 z-50 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 px-4 text-center cursor-pointer hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-semibold">Új bejegyzések érhetők el - Koppints a frissítéshez</span>
          </div>
        </div>
      )}

      {/* Pull to Refresh Loading Indicator */}
      {(isRefreshing || pullDistance > 0) && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 transition-all duration-300"
          style={{ 
            paddingTop: `${Math.min(pullDistance, refreshThreshold) / 2}px`,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / refreshThreshold, 1)
          }}
        >
          <div 
            className="rounded-lg shadow-lg flex items-center justify-center"
            style={{ 
              width: '80px', 
              height: '80px',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }}
          >
            <div className="text-6xl">🎯</div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Jelenleg nincsenek megjeleníthető posztok.</p>
        </div>
      ) : (
        posts.map((originalPost) => {
          // ✅ ÚJ: Alkalmazzuk a pending reakciókat
          const post = getPostWithPendingReaction(originalPost);
          const reactionSummary = getReactionSummary(post.reactions);
          const userReaction = user && post.reactions?.[user.uid];
          const commentsCount = (post.comments || []).length;
          
          // Rekurzív válaszok számolása
          const countReplies = (comments) => {
            let count = 0;
            comments?.forEach(comment => {
              count += (comment.replies?.length || 0);
              if (comment.replies) {
                count += countReplies(comment.replies);
              }
            });
            return count;
          };
          const totalReplies = countReplies(post.comments);

          // Pharmagister poszt - speciális kezelés
          if (post.postType === 'pharmaDemand') {
            // Monogram generálás
            const getMonogram = (name) => {
              if (!name) return '?';
              const words = name.trim().split(' ');
              if (words.length >= 2) {
                return (words[0][0] + words[1][0]).toUpperCase();
              }
              return name.substring(0, 2).toUpperCase();
            };

            return (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
                  <div className="flex items-center gap-3">
                    {post.pharmacyPhotoURL ? (
                      <img 
                        src={post.pharmacyPhotoURL} 
                        alt={post.pharmacyName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-green-600"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center border-2 border-green-700">
                        <span className="text-white font-bold text-lg">
                          {getMonogram(post.pharmacyName)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.pharmacyName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {post.pharmacyZipCode} {post.pharmacyCity}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Pharmagister
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    {post.positionLabel} helyettesítés szükséges
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Dátum</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(post.date).toLocaleDateString('hu-HU')}
                      </span>
                    </div>
                    
                    {post.workHours && (
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Munkaidő</span>
                        <span className="font-medium text-gray-900 dark:text-white">{post.workHours}</span>
                      </div>
                    )}

                    {post.minExperience && (
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Tapasztalat</span>
                        <span className="font-medium text-gray-900 dark:text-white">{post.minExperience}</span>
                      </div>
                    )}

                    {post.maxHourlyRate && (
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Maximum órabér</span>
                        <span className="font-medium text-gray-900 dark:text-white">{post.maxHourlyRate} Ft/óra</span>
                      </div>
                    )}
                  </div>

                  {post.requiredSoftware && post.requiredSoftware.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Szoftverismeret:</p>
                      <div className="flex flex-wrap gap-2">
                        {post.requiredSoftware.map((software, idx) => (
                          <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                            {software}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {post.additionalRequirements && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {post.additionalRequirements}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => router.push(`/pharmagister?demandId=${post.pharmaDemandId}`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Megtekintés és jelentkezés</span>
                  </button>
                </div>
              </div>
            );
          }

          // Activity post rendering - Facebook style
          if (post.postType === 'reactionActivity') {
            return (
              <div key={post.id} className="bg-white dark:bg-gray-800 py-3 px-3">
                <div className="flex gap-3">
                  <img
                    src={post.authorData?.photoURL || '/default-avatar.svg'}
                    alt="Author"
                    className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80"
                    onClick={() => post.userId && router.push(`/profile/${post.userId}`)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer"
                        onClick={() => post.userId && router.push(`/profile/${post.userId}`)}
                      >
                        {post.authorData?.displayName || 'Névtelen'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        {post.reactionLabel || 'reagált'}
                      </span>
                      <span className="text-2xl">
                        {REACTIONS.find(r => r.type === post.reactionType)?.emoji || '👍'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(post.createdAt)}</p>
                    
                    {/* Original post preview */}
                    {post.originalPostText && (
                      <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {post.originalPostText}
                        </p>
                        {post.originalPostImage && (
                          <img 
                            src={post.originalPostImage} 
                            alt="Post preview"
                            className="mt-2 rounded-lg w-full max-h-48 object-cover"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // ✅ ÚJ: New Provider/Service Post Rendering
          if (post.postType === 'newProvider' || post.postType === 'providerWorkPost' || post.postType === 'availableSlot') {
            return (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.authorData?.photoURL || '/default-avatar.svg'}
                      alt={post.authorData?.displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 cursor-pointer hover:opacity-80"
                      onClick={() => post.userId && router.push(`/profile/${post.userId}`)}
                    />
                    <div className="flex-1">
                      <h3 
                        className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer"
                        onClick={() => post.userId && router.push(`/profile/${post.userId}`)}
                      >
                        {post.authorData?.displayName || 'Névtelen'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {post.serviceCategory || 'Szolgáltató'}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        post.postType === 'newProvider' 
                          ? 'bg-cyan-500 text-white' 
                          : post.postType === 'availableSlot'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {post.postType === 'newProvider' && '🎉 Új szolgáltató'}
                        {post.postType === 'providerWorkPost' && '📸 Munka'}
                        {post.postType === 'availableSlot' && '📅 Szabad időpont'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatTime(post.createdAt)}</p>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Text */}
                  {post.text && (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap mb-3">{post.text}</p>
                  )}

                  {/* Service details for new provider */}
                  {post.postType === 'newProvider' && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">Szolgáltatás</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{post.serviceName}</span>
                      </div>
                      {post.servicePrice && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">Ár</span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{post.servicePrice} Ft</span>
                        </div>
                      )}
                      {post.serviceDuration && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">Időtartam</span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{post.serviceDuration} perc</span>
                        </div>
                      )}
                      {post.serviceLocation && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">Helyszín</span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{post.serviceLocation}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Available slot details */}
                  {post.postType === 'availableSlot' && post.slotDate && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">📅 Dátum</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {new Date(post.slotDate).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' })}
                        </span>
                      </div>
                      {post.slotTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">🕐 Időpont</span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{post.slotTime}</span>
                        </div>
                      )}
                      {post.serviceName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">Szolgáltatás</span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{post.serviceName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Images */}
                  {post.serviceImages && post.serviceImages.length > 0 && (
                    <div className={`grid gap-2 ${post.serviceImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {post.serviceImages.slice(0, 4).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Service image ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxImage(img)}
                        />
                      ))}
                    </div>
                  )}
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setLightboxImage(post.imageUrl)}
                    />
                  )}
                </div>

                {/* Reaction Summary */}
                {(reactionSummary || commentsCount + totalReplies > 0) && (
                  <div className="px-4 pb-1.5 flex items-center text-sm text-gray-500">
                    <div className="flex-1 flex items-center gap-1">
                      {reactionSummary ? (
                        <>
                          {Object.entries(reactionSummary).map(([type, count]) => {
                            const reaction = REACTIONS.find(r => r.type === type);
                            return (
                              <span key={type} className="inline-flex items-center">
                                {reaction?.emoji}
                              </span>
                            );
                          })}
                          <span className="ml-1">
                            {Object.values(reactionSummary).reduce((a, b) => a + b, 0)}
                          </span>
                        </>
                      ) : (
                        <span>0</span>
                      )}
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex-1 flex justify-end gap-3">
                      {commentsCount + totalReplies > 0 ? (
                        <span>{commentsCount + totalReplies} hozzászólás</span>
                      ) : (
                        <span>Nincs még hozzászólás</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-gray-200 dark:border-gray-700 py-2 flex items-center justify-around px-4">
                  <button
                    onClick={() => handleReaction(post.id, userReaction || 'like')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      userReaction ? REACTIONS.find(r => r.type === userReaction)?.color : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {userReaction ? (
                      <>
                        <span className="text-xl leading-none">{REACTIONS.find(r => r.type === userReaction)?.emoji}</span>
                        <span className="font-semibold text-sm">{REACTIONS.find(r => r.type === userReaction)?.label}</span>
                      </>
                    ) : (
                      <>
                        <Star size={16} />
                        <span className="text-sm">Tetszik</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    <MessageCircle size={16} />
                    <span className="text-sm">Hozzászólás</span>
                  </button>
                  {post.postType === 'availableSlot' && (
                    <button
                      onClick={() => router.push(`/szakember/${post.serviceId}?book=true`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm"
                    >
                      📅 Foglalás
                    </button>
                  )}
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="border-t border-gray-200 dark:border-gray-700 py-3 bg-gray-50 dark:bg-gray-900/50 px-4">
                    <div className="flex gap-2 mb-4">
                      <img
                        src={userData?.photoURL || user?.photoURL || '/default-avatar.svg'}
                        alt="Your avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                          placeholder="Írj egy hozzászólást..."
                          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={!commentText[post.id]?.trim()}
                          className="text-cyan-500 hover:text-cyan-600 disabled:text-gray-300 p-2"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(post.comments || []).map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          postId={post.id}
                          depth={0}
                          onReply={handleReply}
                          replyTo={replyTo}
                          replyText={replyText}
                          setReplyText={setReplyText}
                          setReplyTo={setReplyTo}
                          userData={userData}
                          user={user}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={post.id} className="bg-white dark:bg-gray-800">
              {/* Post Header */}
              <div className="py-3 flex items-start justify-between px-3 sm:px-4">
                <div className="flex gap-3">
                  <img
                    src={post.authorData?.photoURL || '/default-avatar.svg'}
                    alt="Author"
                    className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80"
                    onClick={() => post.userId && router.push(`/profile/${post.userId}`)}
                  />
                  <div>
                    <h3 
                      className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer"
                      onClick={() => post.userId && router.push(`/profile/${post.userId}`)}
                    >
                      {post.authorData?.displayName || 'Névtelen'}
                    </h3>
                    <p className="text-xs text-gray-500">{formatTime(post.createdAt)}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {/* Post Content */}
              <div className="pb-2">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap px-3 sm:px-4">{post.text || post.rssTitle}</p>
                {post.rssDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 px-3 sm:px-4">{post.rssDescription}</p>
                )}
                {/* User uploaded image */}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    className="w-full object-cover max-h-96 cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => setLightboxImage(post.imageUrl)}
                  />
                )}
                {/* RSS feed image */}
                {post.rssImageUrl && (
                  <img
                    src={post.rssImageUrl}
                    alt="Post image"
                    className="w-full object-cover max-h-96"
                  />
                )}
              </div>

              {/* Reaction Summary */}
              {(reactionSummary || commentsCount + totalReplies > 0) && (
                <div className="pb-1.5 flex items-center text-sm text-gray-500 px-3 sm:px-4">
                  {/* Bal oldal - Reakciók */}
                  <div 
                    className="flex-1 flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-1 rounded-l"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!reactionSummary) return; // Ha nincs reakció, ne csináljunk semmit
                      // Felhasználói adatok lekérése
                      const reactionsData = [];
                      for (const [userId, reactionType] of Object.entries(post.reactions || {})) {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) {
                          reactionsData.push({
                            userId,
                            reactionType,
                            userData: userDoc.data()
                          });
                        }
                      }
                      setSelectedPostReactions(reactionsData);
                      setShowReactionModal(true);
                    }}
                  >
                    {reactionSummary ? (
                      <>
                        {Object.entries(reactionSummary).map(([type, count]) => {
                          const reaction = REACTIONS.find(r => r.type === type);
                          return (
                            <span key={type} className="inline-flex items-center">
                              {reaction?.emoji}
                            </span>
                          );
                        })}
                        <span className="ml-1">
                          {Object.values(reactionSummary).reduce((a, b) => a + b, 0)}
                        </span>
                      </>
                    ) : (
                      <span>0</span>
                    )}
                  </div>
                  
                  {/* Vékony elválasztó */}
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                  
                  {/* Jobb oldal - Hozzászólások */}
                  <div 
                    className="flex-1 flex justify-end gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors py-1 rounded-r"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowComments({ ...showComments, [post.id]: !showComments[post.id] });
                    }}
                  >
                    {commentsCount + totalReplies > 0 ? (
                      <span>{commentsCount + totalReplies} hozzászólás</span>
                    ) : (
                      <span>Nincs még hozzászólás</span>
                    )}
                    {post.shares > 0 && <span>{post.shares} megosztás</span>}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-200 dark:border-gray-700 py-0.5 flex items-center justify-around">
                {/* Reaction Button */}
                <div className="relative">
                  <button
                    onMouseEnter={() => {
                      // Töröljük a korábbi timeout-ot
                      if (reactionTimeouts.current[post.id]) {
                        clearTimeout(reactionTimeouts.current[post.id]);
                      }
                      setShowReactions(prev => ({ ...prev, [post.id]: true }));
                    }}
                    onMouseLeave={() => {
                      // Töröljük a korábbi timeout-ot
                      if (reactionTimeouts.current[post.id]) {
                        clearTimeout(reactionTimeouts.current[post.id]);
                      }
                      // Új timeout beállítása
                      reactionTimeouts.current[post.id] = setTimeout(() => {
                        setShowReactions(prev => ({ ...prev, [post.id]: false }));
                      }, 500);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Tároljuk a kezdő pozíciót
                      const touch = e.touches[0];
                      reactionTimeouts.current[`${post.id}_startX`] = touch.clientX;
                      reactionTimeouts.current[`${post.id}_startY`] = touch.clientY;
                      reactionTimeouts.current[`${post.id}_moved`] = false;
                      reactionTimeouts.current[`${post.id}_pickerShown`] = false;
                      
                      // 200ms után megjelenítjük az emojikat (hosszú nyomás)
                      reactionTimeouts.current[post.id] = setTimeout(() => {
                        reactionTimeouts.current[`${post.id}_pickerShown`] = true;
                        setShowReactions(prev => ({ ...prev, [post.id]: true }));
                        setHoveredReaction(prev => ({ ...prev, [post.id]: null }));
                      }, 200);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      reactionTimeouts.current[`${post.id}_moved`] = true;
                      
                      // Ha a picker látható, keressük meg melyik emoji fölött van az ujj
                      if (showReactions[post.id]) {
                        const touch = e.touches[0];
                        const positions = reactionPositions.current[post.id];
                        const pickerRect = pickerContainerRefs.current[post.id]?.getBoundingClientRect();
                        if (!positions || !pickerRect) return;
                        
                        let foundReaction = null;
                        const emojiRadiusX = 35; // Oldalsó sugár
                        const emojiRadiusTop = 35; // Felfélé
                        const emojiRadiusBottom = 115; // Lefélé (1 emoji méret extra)
                        
                        REACTIONS.forEach(reaction => {
                          const pos = positions[reaction.type];
                          if (pos) {
                            const absoluteX = pickerRect.left + pos.x;
                            const absoluteY = pickerRect.top + pos.y;
                            
                            const deltaX = touch.clientX - absoluteX;
                            const deltaY = touch.clientY - absoluteY;
                            
                            // Aszimmetrikus hitbox - alattuk több hely
                            const inBoundsX = Math.abs(deltaX) <= emojiRadiusX;
                            const inBoundsY = deltaY >= -emojiRadiusTop && deltaY <= emojiRadiusBottom;
                            
                            if (inBoundsX && inBoundsY) {
                              foundReaction = reaction.type;
                            }
                          }
                        });
                        
                        setHoveredReaction(prev => ({ ...prev, [post.id]: foundReaction }));
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Töröljük a timeout-ot
                      if (reactionTimeouts.current[post.id]) {
                        clearTimeout(reactionTimeouts.current[post.id]);
                      }
                      
                      const pickerWasShown = reactionTimeouts.current[`${post.id}_pickerShown`];
                      const moved = reactionTimeouts.current[`${post.id}_moved`];
                      
                      if (pickerWasShown && showReactions[post.id]) {
                        // Hosszú nyomás volt, alkalmazzuk a kiválasztott reakciót
                        const hovered = hoveredReaction[post.id];
                        if (hovered) {
                          handleReaction(post.id, hovered);
                        }
                        setShowReactions(prev => ({ ...prev, [post.id]: false }));
                        setHoveredReaction(prev => ({ ...prev, [post.id]: null }));
                      } else if (!pickerWasShown && !moved) {
                        // Gyors tap volt - toggle reakció
                        if (userReaction) {
                          handleReaction(post.id, userReaction);
                        } else {
                          handleReaction(post.id, 'like');
                        }
                      }
                      
                      // Reset
                      reactionTimeouts.current[`${post.id}_pickerShown`] = false;
                      reactionTimeouts.current[`${post.id}_moved`] = false;
                    }}
                    onTouchCancel={(e) => {
                      // Ha megszakad a touch, töröljük a timeout-ot és bezárjuk a pickert
                      if (reactionTimeouts.current[post.id]) {
                        clearTimeout(reactionTimeouts.current[post.id]);
                      }
                      setShowReactions(prev => ({ ...prev, [post.id]: false }));
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Desktop-on: ha már van reakciónk, eltávolítjuk
                      if (userReaction) {
                        handleReaction(post.id, userReaction);
                      } else {
                        // Ha nincs, megjelenítjük a pickert
                        setShowReactions(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none ${
                      userReaction ? REACTIONS.find(r => r.type === userReaction)?.color : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {userReaction ? (
                      <>
                        <span className="text-xl leading-none select-none">{REACTIONS.find(r => r.type === userReaction)?.emoji}</span>
                        <span className="font-semibold text-sm select-none">{REACTIONS.find(r => r.type === userReaction)?.label}</span>
                      </>
                    ) : (
                      <>
                        <Star size={16} className="select-none" />
                        <span className="select-none text-sm">Tetszik</span>
                      </>
                    )}
                  </button>

                  {/* Reaction Picker */}
                  {showReactions[post.id] && (
                    <>
                      {/* Teljes képernyős overlay a touch események elkapásához */}
                      <div 
                        className="fixed inset-0 z-40"
                        style={{ touchAction: 'none' }}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          const touch = e.touches[0];
                          const positions = reactionPositions.current[post.id];
                          if (!positions) return;
                          
                          let foundReaction = null;
                          const emojiRadiusX = 35;
                          const emojiRadiusTop = 35;
                          const emojiRadiusBottom = 115;
                          const pickerRect = pickerContainerRefs.current[post.id]?.getBoundingClientRect();
                          if (!pickerRect) return;
                          
                          REACTIONS.forEach(reaction => {
                            const pos = positions[reaction.type];
                            if (pos) {
                              const absoluteX = pickerRect.left + pos.x;
                              const absoluteY = pickerRect.top + pos.y;
                              
                              const deltaX = touch.clientX - absoluteX;
                              const deltaY = touch.clientY - absoluteY;
                              
                              const inBoundsX = Math.abs(deltaX) <= emojiRadiusX;
                              const inBoundsY = deltaY >= -emojiRadiusTop && deltaY <= emojiRadiusBottom;
                              
                              if (inBoundsX && inBoundsY) {
                                foundReaction = reaction.type;
                              }
                            }
                          });
                          
                          setHoveredReaction(prev => ({ ...prev, [post.id]: foundReaction }));
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          const hovered = hoveredReaction[post.id];
                          if (hovered) {
                            handleReaction(post.id, hovered);
                          }
                          setShowReactions(prev => ({ ...prev, [post.id]: false }));
                          setHoveredReaction(prev => ({ ...prev, [post.id]: null }));
                        }}
                      />
                      {/* Emoji picker */}
                      <div 
                        ref={(el) => { pickerContainerRefs.current[post.id] = el; }}
                        className="absolute bottom-full left-0 mb-2 z-50"
                        style={{ width: '320px', height: '140px', touchAction: 'none' }}
                        onTouchMove={(e) => {
                        // Megakadályozzuk a scroll-t és detektáljuk melyik emoji fölött van az ujj
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const touch = e.touches[0];
                        const positions = reactionPositions.current[post.id];
                        if (!positions) return;
                        
                        let foundReaction = null;
                        const emojiRadiusX = 35;
                        const emojiRadiusTop = 35;
                        const emojiRadiusBottom = 115;
                        const pickerRect = pickerContainerRefs.current[post.id]?.getBoundingClientRect();
                        if (!pickerRect) return;
                        
                        REACTIONS.forEach(reaction => {
                          const pos = positions[reaction.type];
                          if (pos) {
                            const absoluteX = pickerRect.left + pos.x;
                            const absoluteY = pickerRect.top + pos.y;
                            
                            const deltaX = touch.clientX - absoluteX;
                            const deltaY = touch.clientY - absoluteY;
                            
                            const inBoundsX = Math.abs(deltaX) <= emojiRadiusX;
                            const inBoundsY = deltaY >= -emojiRadiusTop && deltaY <= emojiRadiusBottom;
                            
                            if (inBoundsX && inBoundsY) {
                              foundReaction = reaction.type;
                            }
                          }
                        });
                        
                        setHoveredReaction(prev => ({ ...prev, [post.id]: foundReaction }));
                      }}
                      onTouchEnd={(e) => {
                        // Ha a picker div-en engedjük el, alkalmazzuk a reakciót
                        const hovered = hoveredReaction[post.id];
                        if (hovered) {
                          handleReaction(post.id, hovered);
                        }
                        setShowReactions(prev => ({ ...prev, [post.id]: false }));
                        setHoveredReaction(prev => ({ ...prev, [post.id]: null }));
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => {
                        // Töröljük a bezárási timeout-ot
                        if (reactionTimeouts.current[post.id]) {
                          clearTimeout(reactionTimeouts.current[post.id]);
                        }
                        setShowReactions(prev => ({ ...prev, [post.id]: true }));
                      }}
                      onMouseLeave={() => {
                        // Töröljük a korábbi timeout-ot
                        if (reactionTimeouts.current[post.id]) {
                          clearTimeout(reactionTimeouts.current[post.id]);
                        }
                        // Új timeout beállítása
                        reactionTimeouts.current[post.id] = setTimeout(() => {
                          setShowReactions(prev => ({ ...prev, [post.id]: false }));
                        }, 500);
                      }}
                    >
                      {REACTIONS.map((reaction, index) => {
                        // Egyenes vonal - egyenlő távolságra vízszintesen
                        const spacing = 60; // Távolság az emojik között
                        const yPosition = 60; // Fix magasság (körülbelül a szív magasságában)
                        const offsetX = 20; // Fél emoji szélesség eltolás jobbra
                        
                        const posX = index * spacing + offsetX;
                        const posY = yPosition;
                        
                        // Tároljuk a pozíciókat a hitbox detektáláshoz
                        if (!reactionPositions.current[post.id]) {
                          reactionPositions.current[post.id] = {};
                        }
                        reactionPositions.current[post.id][reaction.type] = { x: posX, y: posY };
                        
                        const isHovered = hoveredReaction[post.id] === reaction.type;
                        
                        return (
                          <button
                            key={reaction.type}
                            ref={(el) => {
                              if (!reactionRefs.current[post.id]) {
                                reactionRefs.current[post.id] = {};
                              }
                              reactionRefs.current[post.id][reaction.type] = el;
                            }}
                            data-reaction-type={reaction.type}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setHoveredReaction(prev => ({ ...prev, [post.id]: reaction.type }));
                            }}
                            onTouchMove={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleReaction(post.id, reaction.type);
                              setShowReactions(prev => ({ ...prev, [post.id]: false }));
                            }}
                            className={`absolute transition-all duration-150 text-4xl select-none ${isHovered ? 'scale-[4]' : 'scale-100'}`}
                            style={{
                              left: `${posX}px`,
                              top: `${posY}px`,
                              pointerEvents: 'auto',
                              touchAction: 'none',
                              padding: '16px',
                              margin: '-16px'
                            }}
                            title={reaction.label}
                          >
                            {reaction.emoji}
                          </button>
                        );
                      })}
                    </div>
                  </>
                  )}
                </div>

                <button
                  onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <MessageCircle size={16} />
                  <span className="text-sm">Hozzászólás</span>
                </button>

                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
                  <Share2 size={16} />
                  <span className="text-sm">Megosztás</span>
                </button>
              </div>

              {/* Comments Section */}
              {showComments[post.id] && (
                <div className="border-t border-gray-200 dark:border-gray-700 py-3 bg-gray-50 dark:bg-gray-900/50 px-3 sm:px-4">
                  {/* Comment Input */}
                  <div className="flex gap-2 mb-4">
                    <img
                      src={userData?.photoURL || user?.photoURL || '/default-avatar.svg'}
                      alt="Your avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                        placeholder="Írj egy hozzászólást..."
                        className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!commentText[post.id]?.trim()}
                        className="text-cyan-500 hover:text-cyan-600 disabled:text-gray-300 disabled:cursor-not-allowed p-2"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Comments List - Fa struktúra */}
                  <div className="space-y-3">
                    {(post.comments || []).map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        postId={post.id}
                        depth={0}
                        onReply={handleReply}
                        replyTo={replyTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        setReplyTo={setReplyTo}
                        userData={userData}
                        user={user}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Reaction Modal */}
      {showReactionModal && selectedPostReactions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowReactionModal(false);
            setSelectedPostReactions(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reakciók ({selectedPostReactions.length})
              </h3>
              <button
                onClick={() => {
                  setShowReactionModal(false);
                  setSelectedPostReactions(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Reactions List */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              {selectedPostReactions.map(({ userId, reactionType, userData }) => {
                const reaction = REACTIONS.find(r => r.type === reactionType);
                return (
                  <div
                    key={userId}
                    onClick={() => {
                      router.push(`/profile/${userId}`);
                      setShowReactionModal(false);
                      setSelectedPostReactions(null);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <img
                      src={userData?.photoURL || '/default-avatar.svg'}
                      alt={userData?.displayName || 'Felhasználó'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {userData?.displayName || 'Névtelen'}
                      </p>
                      {userData?.profession && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {userData.profession}
                        </p>
                      )}
                    </div>
                    <span className="text-2xl">
                      {reaction?.emoji}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ✅ ÚJ: Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="h-10">
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
          </div>
        )}
      </div>

      {/* ✅ ÚJ: End of Feed Message */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          🎉 Elérted a hírfolyam végét
        </div>
      )}
    </div>
  );
}
