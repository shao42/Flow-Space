import { useCallback, useEffect, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useMailboxStore } from '../store/mailboxStore';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function MailboxPanel() {
  const panelOpen = useMailboxStore((s) => s.panelOpen);
  const setPanelOpen = useMailboxStore((s) => s.setPanelOpen);
  const view = useMailboxStore((s) => s.view);
  const setView = useMailboxStore((s) => s.setView);
  const session = useMailboxStore((s) => s.session);
  const authMode = useMailboxStore((s) => s.authMode);
  const setAuthMode = useMailboxStore((s) => s.setAuthMode);
  const authUsername = useMailboxStore((s) => s.authUsername);
  const setAuthUsername = useMailboxStore((s) => s.setAuthUsername);
  const authPassword = useMailboxStore((s) => s.authPassword);
  const setAuthPassword = useMailboxStore((s) => s.setAuthPassword);
  const submitAuth = useMailboxStore((s) => s.submitAuth);
  const logout = useMailboxStore((s) => s.logout);
  const inbox = useMailboxStore((s) => s.inbox);
  const sent = useMailboxStore((s) => s.sent);
  const activeLetter = useMailboxStore((s) => s.activeLetter);
  const loading = useMailboxStore((s) => s.loading);
  const error = useMailboxStore((s) => s.error);
  const clearError = useMailboxStore((s) => s.clearError);
  const apiConfigured = useMailboxStore((s) => s.apiConfigured);
  const composeTo = useMailboxStore((s) => s.composeTo);
  const setComposeTo = useMailboxStore((s) => s.setComposeTo);
  const composeSubject = useMailboxStore((s) => s.composeSubject);
  const setComposeSubject = useMailboxStore((s) => s.setComposeSubject);
  const composeText = useMailboxStore((s) => s.composeText);
  const setComposeText = useMailboxStore((s) => s.setComposeText);
  const attachAtmosphere = useMailboxStore((s) => s.attachAtmosphere);
  const setAttachAtmosphere = useMailboxStore((s) => s.setAttachAtmosphere);
  const searchHits = useMailboxStore((s) => s.searchHits);
  const runUserSearch = useMailboxStore((s) => s.runUserSearch);
  const openLetter = useMailboxStore((s) => s.openLetter);
  const openCompose = useMailboxStore((s) => s.openCompose);
  const sendCompose = useMailboxStore((s) => s.sendCompose);
  const fillComposeFromDraft = useMailboxStore((s) => s.fillComposeFromDraft);
  const recallLetter = useMailboxStore((s) => s.recallLetter);
  const deleteFromInbox = useMailboxStore((s) => s.deleteFromInbox);
  const refreshLists = useMailboxStore((s) => s.refreshLists);

  const draftText = useFlowStore((s) => s.draftText);
  const atmosphereMode = useFlowStore((s) => s.atmosphereMode);

  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (view !== 'compose') return;
    const t = setTimeout(() => void runUserSearch(composeTo), 200);
    return () => clearTimeout(t);
  }, [composeTo, view, runUserSearch]);

  const onSend = useCallback(() => {
    void sendCompose(attachAtmosphere ? atmosphereMode : undefined);
  }, [sendCompose, attachAtmosphere, atmosphereMode]);

  const onReply = useCallback(() => {
    if (!activeLetter) return;
    openCompose(activeLetter.fromUsername);
  }, [activeLetter, openCompose]);

  if (!panelOpen) return null;

  const list = view === 'sent' ? sent : inbox;
  const isMine = activeLetter && session && activeLetter.fromUserId === session.id;

  return (
    <aside className="fs-mailbox" role="dialog" aria-label="信箱">
      <header className="fs-mailbox__head">
        {view !== 'auth' && session ? (
          <button
            type="button"
            className="fs-mailbox__back"
            onClick={() => {
              if (view === 'read' || view === 'compose') setView('inbox');
              else setView('inbox');
            }}
          >
            ← {view === 'inbox' || view === 'sent' ? '信箱' : '返回'}
          </button>
        ) : (
          <span className="fs-mailbox__title">信箱</span>
        )}
        <button
          type="button"
          className="fs-mailbox__close"
          aria-label="关闭信箱"
          onClick={() => setPanelOpen(false)}
        >
          ×
        </button>
      </header>

      {import.meta.env.DEV && (
        <p className="fs-mailbox__warn">
          本地开发请另开终端运行 <code>npm run mailbox:dev</code>（API 经 Vite 代理到{' '}
          <code>/api</code>）。
        </p>
      )}

      {error && (
        <div className="fs-mailbox__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            关闭
          </button>
        </div>
      )}

      {view === 'auth' && (
        <div className="fs-mailbox__body">
          <div className="fs-mailbox__tabs">
            <button
              type="button"
              className={authMode === 'login' ? 'fs-mailbox__tab fs-mailbox__tab--active' : 'fs-mailbox__tab'}
              onClick={() => setAuthMode('login')}
            >
              登录
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'fs-mailbox__tab fs-mailbox__tab--active' : 'fs-mailbox__tab'}
              onClick={() => setAuthMode('register')}
            >
              注册
            </button>
          </div>
          <label className="fs-mailbox__label">
            用户名
            <input
              className="fs-mailbox__input"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              autoComplete="username"
              placeholder="小写字母、数字、下划线"
            />
          </label>
          <label className="fs-mailbox__label">
            密码
            <input
              className="fs-mailbox__input"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              placeholder="至少 8 位"
            />
          </label>
          <p className="fs-mailbox__hint">
            {authMode === 'register'
              ? '注册后用户名即他人寄信时使用的地址。请牢记密码，MVP 暂不支持找回。'
              : '登录后可收发信件。'}
          </p>
          <button
            type="button"
            className="fs-mailbox__primary"
            disabled={loading || !apiConfigured}
            onClick={() => void submitAuth()}
          >
            {authMode === 'register' ? '注册' : '登录'}
          </button>
        </div>
      )}

      {session && view === 'inbox' && (
        <div className="fs-mailbox__body">
          <div className="fs-mailbox__user-bar">
            <span className="fs-mailbox__user-name">@{session.username}</span>
            <button type="button" className="fs-mailbox__ghost" onClick={logout}>
              退出
            </button>
          </div>
          <div className="fs-mailbox__tabs">
            <button type="button" className="fs-mailbox__tab fs-mailbox__tab--active">
              收件箱
            </button>
            <button type="button" className="fs-mailbox__tab" onClick={() => setView('sent')}>
              已发送
            </button>
          </div>
          <div className="fs-mailbox__actions">
            <button type="button" className="fs-mailbox__primary" onClick={() => openCompose()}>
              写信
            </button>
            <button type="button" className="fs-mailbox__ghost" onClick={() => void refreshLists()}>
              刷新
            </button>
          </div>
          {list.length === 0 ? (
            <p className="fs-mailbox__empty">收件箱是空的。写一封信给朋友吧。</p>
          ) : (
            <ul className="fs-mailbox__letter-list">
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`fs-mailbox__letter-row ${item.unread ? 'fs-mailbox__letter-row--unread' : ''}`}
                    onClick={() => void openLetter(item.id)}
                  >
                    <span className="fs-mailbox__letter-from">
                      {item.unread && <span className="fs-mailbox__dot" aria-hidden />}
                      {item.peerDisplayName}
                      <span className="fs-mailbox__letter-user">@{item.peerUsername}</span>
                    </span>
                    {item.subject && <span className="fs-mailbox__letter-subject">{item.subject}</span>}
                    <span className="fs-mailbox__letter-preview">{item.preview}</span>
                    <span className="fs-mailbox__letter-time">{formatTime(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {session && view === 'sent' && (
        <div className="fs-mailbox__body">
          <div className="fs-mailbox__tabs">
            <button type="button" className="fs-mailbox__tab" onClick={() => setView('inbox')}>
              收件箱
            </button>
            <button type="button" className="fs-mailbox__tab fs-mailbox__tab--active">
              已发送
            </button>
          </div>
          <div className="fs-mailbox__actions">
            <button type="button" className="fs-mailbox__primary" onClick={() => openCompose()}>
              写信
            </button>
          </div>
          {sent.length === 0 ? (
            <p className="fs-mailbox__empty">还没有寄出的信。</p>
          ) : (
            <ul className="fs-mailbox__letter-list">
              {sent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="fs-mailbox__letter-row"
                    onClick={() => void openLetter(item.id)}
                  >
                    <span className="fs-mailbox__letter-from">
                      致 {item.peerDisplayName}
                      <span className="fs-mailbox__letter-user">@{item.peerUsername}</span>
                    </span>
                    {item.subject && <span className="fs-mailbox__letter-subject">{item.subject}</span>}
                    <span className="fs-mailbox__letter-preview">{item.preview}</span>
                    <span className="fs-mailbox__letter-time">{formatTime(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {session && view === 'read' && activeLetter && (
        <div className="fs-mailbox__body fs-mailbox__body--read">
          <div className="fs-mailbox__letter-head">
            <p className="fs-mailbox__letter-head-line">
              <strong>自</strong> {activeLetter.fromDisplayName} @{activeLetter.fromUsername}
            </p>
            <p className="fs-mailbox__letter-head-line">
              <strong>至</strong> {activeLetter.toDisplayName} @{activeLetter.toUsername}
            </p>
            {activeLetter.subject && (
              <p className="fs-mailbox__letter-head-subject">{activeLetter.subject}</p>
            )}
            <p className="fs-mailbox__letter-time">{formatTime(activeLetter.createdAt)}</p>
            {activeLetter.atmosphereMode && (
              <span className="fs-mailbox__msg-tag">{activeLetter.atmosphereMode}</span>
            )}
          </div>
          <div className="fs-mailbox__letter-body">
            {activeLetter.withdrawn ? '已撤回' : activeLetter.body}
          </div>
          <div className="fs-mailbox__read-actions">
            {!activeLetter.withdrawn && !isMine && (
              <button type="button" className="fs-mailbox__primary" onClick={onReply}>
                回复
              </button>
            )}
            {isMine && !activeLetter.withdrawn && (
              <button type="button" className="fs-mailbox__ghost" onClick={() => void recallLetter()}>
                撤回
              </button>
            )}
            {!isMine && (
              <button type="button" className="fs-mailbox__ghost" onClick={() => void deleteFromInbox()}>
                删除
              </button>
            )}
          </div>
        </div>
      )}

      {session && view === 'compose' && (
        <div className="fs-mailbox__body fs-mailbox__body--compose">
          <label className="fs-mailbox__label">
            收件人
            <input
              className="fs-mailbox__input"
              value={composeTo}
              onChange={(e) => {
                setComposeTo(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="用户名"
              autoComplete="off"
            />
          </label>
          {searchOpen && searchHits.length > 0 && (
            <ul className="fs-mailbox__search-hits">
              {searchHits.map((u) => (
                <li key={u.username}>
                  <button
                    type="button"
                    onClick={() => {
                      setComposeTo(u.username);
                      setSearchOpen(false);
                    }}
                  >
                    {u.displayName} @{u.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="fs-mailbox__label">
            主题（可选）
            <input
              className="fs-mailbox__input"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              maxLength={120}
            />
          </label>
          <textarea
            className="fs-mailbox__compose-input"
            rows={8}
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            placeholder="正文…"
            maxLength={20000}
          />
          <label className="fs-mailbox__check">
            <input
              type="checkbox"
              checked={attachAtmosphere}
              onChange={(e) => setAttachAtmosphere(e.target.checked)}
            />
            附带当前氛围
          </label>
          <div className="fs-mailbox__compose-actions">
            <button
              type="button"
              className="fs-mailbox__ghost"
              onClick={() => fillComposeFromDraft(draftText)}
            >
              从编辑器寄出
            </button>
            <button type="button" className="fs-mailbox__primary" disabled={loading} onClick={onSend}>
              寄出
            </button>
          </div>
        </div>
      )}

      <div id="mailbox-terms" className="fs-mailbox__terms-block">
        <strong>使用须知</strong>
        <p>禁止发送违法或骚扰内容。消息存储在服务端。请牢记账号密码，暂不支持找回。</p>
      </div>
    </aside>
  );
}
