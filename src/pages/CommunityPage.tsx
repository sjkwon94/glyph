import { Eye, Heart, MessageCircle, PenLine, Pin, Search, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { ContentSafetyActions } from '../components/ContentSafetyActions';
import { categories, communityPosts, type CategoryId, getCategoryLabel } from '../data';
import { useApp } from '../state/AppContext';

export function CommunityPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const boardCategories = categories.filter((item): item is typeof item & { id: Exclude<CategoryId, 'all'> } => item.id !== 'all');
  const initial = categoryId as Exclude<CategoryId, 'all'>;
  const [category, setCategory] = useState<Exclude<CategoryId, 'all'>>(boardCategories.some((item) => item.id === initial) ? initial : 'martial');
  const [query, setQuery] = useState('');
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const { reactions, setReaction, blockedUsers, userPosts, createCommunityPost, syncError } = useApp();
  const localPosts = useMemo(() => [...userPosts, ...communityPosts], [userPosts]);

  const shown = useMemo(() => localPosts.filter((post) => post.category === category && !blockedUsers.includes(post.author) && `${post.title} ${post.body}`.toLowerCase().includes(query.toLowerCase())), [blockedUsers, category, localPosts, query]);

  const selectCategory = (id: Exclude<CategoryId, 'all'>) => {
    setCategory(id);
    navigate(`/community/${id}`);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const result = await createCommunityPost(category, title, body);
    if (!result.ok) { setMessage(result.reason ?? '글을 등록하지 못했습니다.'); return; }
    setTitle(''); setBody(''); setWriting(false);
  };

  return (
    <div className="page-container inner-page community-page">
      <header className="page-title split-title"><div><span className="section-kicker">커뮤니티</span><h1>장르별 게시판</h1><p>작품 감상, 추천, 추리글을 장르별로 나눠보세요.</p></div><button className="primary-button" type="button" onClick={() => setWriting(true)}><PenLine size={18} /> 글쓰기</button></header>
      {(message || syncError) && <div className="config-notice" role="status">{message || syncError}</div>}
      <div className="community-layout">
        <aside className="community-categories"><strong>장르 게시판</strong>{boardCategories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} type="button" onClick={() => selectCategory(item.id)}><span>{item.symbol}</span>{item.label}<small>{localPosts.filter((post) => post.category === item.id).length}</small></button>)}</aside>
        <section className="community-feed">
          <div className="feed-toolbar"><div><strong>{getCategoryLabel(category)} 이야기</strong><span>{shown.length}개의 게시글</span></div><label className="search-field small"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="게시글 검색" /></label></div>
          <div className="feed-list">{shown.map((post) => { const reaction = reactions[`post:${post.id}`]; return <article className="feed-card" key={post.id}><div className="feed-card-main"><div className="post-label-line">{'pinned' in post && post.pinned && <span className="pin-label"><Pin size={12} /> 공지</span>}<span>{post.categoryLabel}</span><small>{post.createdAt}</small></div><h2>{post.title}</h2><p>{post.body}</p><div className="post-author"><span>{post.author.slice(0, 1)}</span><strong>{post.author}</strong><ContentSafetyActions targetId={post.id} targetType="community_post" author={post.author} authorId={'authorId' in post ? post.authorId : undefined} /></div></div><footer><div><span><Eye size={15} /> {post.views}</span><span><MessageCircle size={15} /> {post.comments}</span></div><div><button type="button" className={reaction === 'like' ? 'selected' : ''} onClick={() => setReaction(`post:${post.id}`, 'like')}><ThumbsUp size={15} /> {post.likes + (reaction === 'like' ? 1 : 0)}</button><button type="button" className={reaction === 'dislike' ? 'selected dislike' : ''} onClick={() => setReaction(`post:${post.id}`, 'dislike')}><ThumbsDown size={15} /></button></div></footer></article>; })}</div>
        </section>
        <aside className="community-side"><div className="community-guide"><Heart /><strong>좋은 광장을 함께 만들어요</strong><p>작품과 사람을 존중하고, 스포일러가 있다면 제목에 표시해 주세요.</p><a href="#/community-policy">커뮤니티 운영 원칙</a></div><div className="hot-tags"><strong>지금 뜨는 이야기</strong><span>#재가된검</span><span>#13층범인</span><span>#이번주신작</span><span>#완결추천</span></div></aside>
      </div>

      {writing && <Modal title="새 이야기 쓰기" onClose={() => setWriting(false)} wide><form className="write-post-form" onSubmit={submit}><label>장르 게시판<select value={category} onChange={(event) => selectCategory(event.target.value as Exclude<CategoryId, 'all'>)}>{boardCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>제목<input value={title} onChange={(event) => { setTitle(event.target.value); setMessage(''); }} maxLength={120} placeholder="무슨 이야기를 나눌까요?" /></label><label>내용<textarea value={body} onChange={(event) => { setBody(event.target.value); setMessage(''); }} maxLength={5000} placeholder="작품과 다른 독자를 존중하는 내용을 작성해 주세요." /></label>{message && <p className="form-message" role="status">{message}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setWriting(false)}><X size={17} /> 취소</button><button className="primary-button" disabled={!title.trim() || !body.trim()}><PenLine size={17} /> 등록하기</button></div></form></Modal>}
    </div>
  );
}
