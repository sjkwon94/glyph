import { Check, ChevronRight, CirclePlay, Coins, CreditCard, Gift, History, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../components/Modal';
import { COOKIE_EVENT_END_DATE, EVENT_AD_REWARD, promotionalCookies } from '../promotions';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

const packages = [
  { cookies: 10, price: '1,000원', popular: false },
  { cookies: 55, price: '5,000원', popular: true },
  { cookies: 120, price: '10,000원', popular: false },
  { cookies: 250, price: '20,000원', popular: false },
];

export function WalletPage() {
  const { cookieBalance, adRewardsToday, grantAdReward, mockPurchase } = useApp();
  const { demoMode } = useAuth();
  const [buying, setBuying] = useState<(typeof packages)[number] | null>(null);
  const [adOpen, setAdOpen] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [adTimer, setAdTimer] = useState<number | null>(null);

  const startAd = () => {
    if (!demoMode || adTimer || adRewardsToday >= 5) return;
    setSeconds(30);
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer); setAdTimer(null); grantAdReward(EVENT_AD_REWARD); setAdOpen(false); return 0;
        }
        return value - 1;
      });
    }, 1000);
    setAdTimer(timer);
  };

  const closeAd = () => {
    if (adTimer) window.clearInterval(adTimer);
    setAdTimer(null); setAdOpen(false); setSeconds(30);
  };

  const completePurchase = () => {
    if (!demoMode || !buying) return;
    mockPurchase(promotionalCookies(buying.cookies));
    setBuying(null);
  };

  return (
    <div className="wallet-page">
      <div className="page-container inner-page">
        <header className="page-title"><span className="section-kicker">이용권</span><h1>쿠키 충전</h1><p>광고를 보고 무료 쿠키를 받거나 필요한 만큼 충전하세요.</p></header>
        {!demoMode && <div className="config-notice">PG와 광고 공급자의 운영 검증이 끝나기 전에는 쿠키 지급 기능을 활성화하지 않습니다.</div>}
        <section className="wallet-balance"><div><span className="cookie-coin"><Coins /></span><div><p>보유 쿠키</p><strong>{cookieBalance}<small>개</small></strong></div></div><button type="button"><History /> 이용 내역 <ChevronRight /></button></section>
        <section className="double-event-banner"><span><Gift /> 기간 한정</span><div><strong>쿠키 2배 이벤트</strong><p>{COOKIE_EVENT_END_DATE}까지 충전 쿠키와 광고 보상이 모두 두 배로 지급됩니다.</p></div><b>×2</b></section>
        <section className="reward-banner"><div className="reward-visual"><CirclePlay /><span>30</span></div><div><span>하루 5번 무료 · 2배 적용</span><h2>30초 광고 보고 쿠키 {EVENT_AD_REWARD}개 받기</h2><p>오늘 {adRewardsToday}/5회 참여 · 광고를 끝까지 시청하면 즉시 지급됩니다.</p></div><button className="light-button" type="button" disabled={!demoMode || adRewardsToday >= 5} onClick={() => setAdOpen(true)}>{!demoMode ? '연동 준비 중' : adRewardsToday >= 5 ? '오늘 보상 완료' : '광고 보고 받기'}</button></section>
        <section className="purchase-section"><div className="section-heading compact"><div><span className="section-kicker"><Gift size={15} /> 쿠키 충전</span><h2>지금 충전하면 두 배 지급</h2></div></div><div className="package-grid">{packages.map((item) => <button type="button" key={item.cookies} className={item.popular ? 'popular' : ''} disabled={!demoMode} onClick={() => setBuying(item)}>{item.popular && <span className="popular-label">가장 인기</span>}<span className="package-icon"><Coins /></span><span className="package-original">기본 {item.cookies}개</span><strong>{promotionalCookies(item.cookies)}<small> 쿠키</small></strong><em>2배 이벤트 적용</em><b>{item.price}</b></button>)}</div><div className="payment-safety"><ShieldCheck /><div><strong>안전한 결제</strong><p>운영 환경에서는 결제사가 결제를 확인한 뒤 서버가 쿠키를 지급합니다. 카드 정보는 글리프가 저장하지 않습니다.</p></div><LockKeyhole /></div></section>
      </div>

      {buying && <Modal title="쿠키 결제 확인" onClose={() => setBuying(null)}><div className="checkout-demo"><div className="demo-warning">현재 데모 모드입니다. 실제 결제는 발생하지 않습니다.</div><div className="checkout-product"><Coins /><span><strong>{promotionalCookies(buying.cookies)} 쿠키</strong><small>기본 {buying.cookies}개 + 이벤트 {buying.cookies}개</small></span><b>{buying.price}</b></div><div className="checkout-method"><CreditCard /><span>테스트 결제 수단</span><Check /></div><button className="primary-button full" type="button" onClick={completePurchase}>데모 결제 완료</button><p>실서비스에서는 토스페이먼츠 등 PG의 승인 결과를 서버에서 검증한 뒤 지급합니다.</p></div></Modal>}
      {adOpen && <Modal title="보상형 광고" onClose={closeAd}><div className="ad-demo"><div className="ad-screen"><span>GLYPH REWARDED</span><strong>{seconds}</strong><small>{adTimer ? '광고 재생 중 · 창을 닫으면 보상이 취소됩니다' : '데모 광고입니다'}</small></div><p>30초를 모두 시청하면 이벤트 쿠키 {EVENT_AD_REWARD}개를 받습니다.</p><button className="primary-button full" type="button" disabled={!!adTimer} onClick={startAd}>{adTimer ? `${seconds}초 남음` : '광고 시작하기'}</button></div></Modal>}
    </div>
  );
}
