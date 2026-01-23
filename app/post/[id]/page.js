'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, MessageCircle, Send, MoreHorizontal, Calendar, Clock, MapPin, Briefcase, User } from 'lucide-react';

function CommentItem({ comment, postId, depth = 0, onReply, replyTo, replyText, setReplyText, setReplyTo, userData, user, formatTime }) {
  const maxDepth = 5;

  return (
    <div className={`${depth > 0 ? 'ml-10 border-l-2 border-gray-300 dark:border-gray-600 pl-4' : ''}`}>
      {/* Komment */}
      <div className="flex gap-2">
        <img
          src={comment.userPhoto || '/default-avatar.svg'}
          alt="Commenter"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {comment.userName}
            </p>
            <p className="text-sm text-gray-900 dark:text-white break-words">
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
        <div className="flex gap-2 mt-2 ml-10">
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
              placeholder="Válasz"
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
        <div className="mt-3 space-y-3">
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

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState({});
  const [replyText, setReplyText] = useState({});

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Most';
    if (minutes < 60) return `${minutes} perce`;
    if (hours < 24) return `${hours} órája`;
    if (days < 7) return `${days} napja`;
    return date.toLocaleDateString('hu-HU');
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postDoc = await getDoc(doc(db, 'serviceFeedPosts', params.id));
        if (postDoc.exists()) {
          setPost({ id: postDoc.id, ...postDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;

    try {
      const newComment = {
        id: Date.now().toString(),
        text: commentText,
        userId: user.uid,
        userName: userData?.displayName || 'Névtelen',
        userPhoto: userData?.photoURL || user.photoURL || '',
        createdAt: Timestamp.now(),
        replies: []
      };

      const postRef = doc(db, 'serviceFeedPosts', params.id);
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });

      setPost(prev => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }));
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleReply = async (postId, parentCommentId) => {
    const replyKey = `${postId}-${parentCommentId}`;
    if (!replyText[replyKey]?.trim() || !user) return;

    try {
      const newReply = {
        id: Date.now().toString(),
        text: replyText[replyKey],
        userId: user.uid,
        userName: userData?.displayName || 'Névtelen',
        userPhoto: userData?.photoURL || user.photoURL || '',
        createdAt: Timestamp.now(),
        replies: []
      };

      const addReplyToComment = (comments) => {
        return comments.map(comment => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: addReplyToComment(comment.replies)
            };
          }
          return comment;
        });
      };

      const updatedComments = addReplyToComment(post.comments || []);
      
      const postRef = doc(db, 'serviceFeedPosts', postId);
      await updateDoc(postRef, {
        comments: updatedComments
      });

      setPost(prev => ({ ...prev, comments: updatedComments }));
      setReplyText({ ...replyText, [replyKey]: '' });
      setReplyTo({ ...replyTo, [replyKey]: false });
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Poszt nem található</h2>
          <button
            onClick={() => router.push('/')}
            className="text-cyan-500 hover:text-cyan-600"
          >
            Vissza a főoldalra
          </button>
        </div>
      </div>
    );
  }

  const commentsCount = post.comments?.length || 0;
  const totalReplies = (post.comments || []).reduce((sum, comment) => {
    const countReplies = (replies) => {
      if (!replies || replies.length === 0) return 0;
      return replies.length + replies.reduce((s, r) => s + countReplies(r.replies || []), 0);
    };
    return sum + countReplies(comment.replies || []);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Poszt</h1>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 border-b-8 border-gray-200 dark:border-gray-700">
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
            {post.rssLink && (
              <a
                href={post.rssLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-500 hover:text-cyan-600 text-sm mt-1 block px-3 sm:px-4"
              >
                Tovább az oldalra →
              </a>
            )}
          </div>

          {/* Pharmacy Demand specific content */}
          {post.postType === 'pharmacyDemand' && (
            <div className="px-3 sm:px-4 py-3 space-y-2">
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 space-y-3">
                {post.demandDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-sm text-gray-900 dark:text-white font-medium">{post.demandDate}</span>
                  </div>
                )}
                {post.shiftType && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{post.shiftType}</span>
                  </div>
                )}
                {post.pharmacyName && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{post.pharmacyName}</span>
                  </div>
                )}
                {post.pharmacyAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{post.pharmacyAddress}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => router.push(`/pharmagister/demand/${post.demandId}`)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2.5 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                Megnézem
              </button>
            </div>
          )}

          {/* Available Slot specific content */}
          {post.postType === 'availableSlot' && post.slotDate && (
            <div className="px-3 sm:px-4 pb-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 space-y-2">
                {post.slotDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">📅 Dátum</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{post.slotDate}</span>
                  </div>
                )}
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
            </div>
          )}

          {/* Images */}
          {post.serviceImages && post.serviceImages.length > 0 && (
            <div className={`px-3 sm:px-4 pb-3 grid gap-2 ${post.serviceImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {post.serviceImages.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Service image ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
          {post.imageUrl && (
            <div className="px-3 sm:px-4 pb-3">
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full object-cover max-h-96 rounded-lg"
              />
            </div>
          )}

          {/* Reaction Summary */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-500">
              <MessageCircle size={16} className="mr-1" />
              <span>{commentsCount + totalReplies} hozzászólás</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white dark:bg-gray-800 py-4 px-4">
          {/* Comment Input */}
          <div className="flex gap-2 mb-6">
            <img
              src={userData?.photoURL || user?.photoURL || '/default-avatar.svg'}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Írj egy hozzászólást..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="text-cyan-500 hover:text-cyan-600 disabled:text-gray-300 p-2"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
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

          {commentsCount === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>Még nincs hozzászólás</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
