import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { useReducedMotion } from './useReducedMotion';
import PortfolioBackground from './PortfolioBackground';
import JellyNav from './JellyNav';
import { usePortfolioMotion } from './usePortfolioMotion';
import { ArrowRight, ArrowUpRight, Check, Download, Mail, MapPin, Pause, Phone, Play, X } from 'lucide-react';

type Work = { id: string; title: string; duration: string; note: string; wide?: boolean };
const works: Work[] = [
  { id: 'ai-ad', title: 'AI 广告', duration: '00:30', note: 'AI 视觉与商业表达' },
  { id: 'fashion-ad', title: '信息流 · 服装广告', duration: '00:15', note: '服装产品的短视频表达' },
  { id: 'snack-ad', title: '信息流 · 零食广告', duration: '00:14', note: '零食产品的短视频表达' },
  { id: 'talk-1', title: '真人口播 01', duration: '01:18', note: '口播内容剪辑' },
  { id: 'talk-2', title: '真人口播 02', duration: '01:44', note: '口播内容剪辑' },
  { id: 'talk-3', title: '真人口播 03', duration: '06:06', note: '口播内容剪辑' },
  { id: 'interview', title: '真人访谈', duration: '00:39', note: '人物对话与观点表达' },
  { id: 'avatar-1', title: '数字人口播 01', duration: '00:40', note: '数字人内容制作' },
  { id: 'avatar-2', title: '数字人口播 02', duration: '00:31', note: '数字人内容制作' },
  { id: 'vlog', title: '真人 Vlog', duration: '01:37', note: '日常记录与叙事剪辑' },
  { id: 'kingdom', title: '女王的胜利王国', duration: '02:02', note: 'AI 短片创作', wide: true },
  { id: 'heroes', title: '四怪物英雄出场', duration: '00:15', note: 'AI 角色与影像创作', wide: true },
];
const stats = [ ['140+', '参与制作与发布短视频'], ['3W+', '参与运营账号累计涨粉'], ['370W+', '账号单条最高播放量'], ['110+', '制作口播与 Vlog 样片'] ];
const base = './';
const media = (id: string, type = 'mp4') => `${base}media/${id}.${type}`;

function SectionTitle({ lines }: { lines: string[] }) {
  return <h2 className="display-title" aria-label={lines.join(' ')}>{lines.map(line => <span key={line} className="title-mask" aria-hidden="true"><span className="title-text">{line}</span></span>)}<span className="title-rule" aria-hidden="true" /></h2>;
}

export default function App() {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<Work | null>(null);
  const [playing, setPlaying] = useState(!reduced);
  const [navFixed, setNavFixed] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [heroSource, setHeroSource] = useState<string>();
  const [videoError, setVideoError] = useState(false);
  const hero = useRef<HTMLVideoElement>(null);
  const heroShell = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const workVideo = useRef<HTMLVideoElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  usePortfolioMotion();

  useLayoutEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, []);

  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);

  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  useEffect(() => {
    const section = heroShell.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      setNavFixed(!entry.isIntersecting && entry.boundingClientRect.bottom <= 80);
      setHeroVisible(entry.isIntersecting && entry.intersectionRatio > 0);
    }, { rootMargin: '-80px 0px 0px 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setVideoError(false);
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; trigger.current?.focus(); };
  }, [selected]);

  useEffect(() => {
    const video = workVideo.current;
    if (!selected || videoError || !video) return;
    const playlist = `${base}media/streams/${selected.id}/index.m3u8`;
    let player: Hls | undefined;
    let cancelled = false;
    const play = () => { if (!document.hidden) video.play().catch(() => {}); };
    const direct = (source: string) => { video.src = source; play(); };
    const syncLoading = () => {
      if (document.hidden) player?.stopLoad();
      else if (!video.paused) player?.startLoad();
    };
    const startLoading = () => { if (!document.hidden) player?.startLoad(); };
    document.addEventListener('visibilitychange', syncLoading);
    video.addEventListener('play', startLoading);
    if (video.canPlayType('application/vnd.apple.mpegurl')) direct(playlist);
    else import('hls.js/light').then(({ default: HlsPlayer }) => {
      if (cancelled) return;
      if (!HlsPlayer.isSupported()) { direct(media(selected.id)); return; }
      player = new HlsPlayer({ maxBufferLength: 8, maxMaxBufferLength: 12, backBufferLength: 0, maxBufferSize: 4 * 1024 * 1024, autoStartLoad: !document.hidden });
      player.on(HlsPlayer.Events.MANIFEST_PARSED, play);
      player.on(HlsPlayer.Events.ERROR, (_event, data) => { if (data.fatal) setVideoError(true); });
      player.attachMedia(video);
      player.loadSource(playlist);
    }).catch(() => { if (!cancelled) direct(media(selected.id)); });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', syncLoading);
      video.removeEventListener('play', startLoading);
      player?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [selected, videoError]);

  useEffect(() => {
    if (!selected) return;
    let resume = false;
    const syncVideo = () => {
      const video = workVideo.current;
      if (!video) return;
      if (document.hidden) { resume = !video.paused; video.pause(); }
      else if (resume) { resume = false; video.play().catch(() => {}); }
    };
    document.addEventListener('visibilitychange', syncVideo);
    return () => document.removeEventListener('visibilitychange', syncVideo);
  }, [selected]);

  useEffect(() => {
    if (heroSource || !playing || !heroVisible || !pageVisible || selected) return;
    const timer = window.setTimeout(() => {
      setHeroSource(media(window.matchMedia('(max-width: 640px)').matches ? 'hero-mobile' : 'hero-desktop'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [heroSource, playing, heroVisible, pageVisible, selected]);

  useEffect(() => {
    const video = hero.current;
    if (!video) return;
    let cancelled = false;
    if (heroSource && playing && !selected && heroVisible && pageVisible) video.play().catch(() => { if (!cancelled) setPlaying(false); });
    else video.pause();
    return () => { cancelled = true; };
  }, [heroSource, playing, selected, heroVisible, pageVisible]);

  const close = () => { workVideo.current?.pause(); dialog.current?.close(); };
  return <>
    <a href="#works" className="skip-link">跳至作品</a>
    <nav aria-label="主导航" className={`hero-nav${navFixed ? ' is-fixed' : ''}`}>
      <JellyNav />
    </nav>
    <header ref={heroShell} className="hero-shell" id="top">
      <div className="hero-frame">
        <video ref={hero} className="hero-video" src={heroSource} poster={media('hero-poster', 'webp')} preload="none" width="1280" height="724" loop muted playsInline aria-hidden="true" />
        <div className="hero-shade" /><div className="noise-overlay" />
        <div className="opening-curtain" aria-hidden="true" />
        <div className="hero-middle"><span className="eyebrow">VIDEO EDITING & AI FILMMAKING</span><h1><span className="text-mask"><span className="hero-title-line">让内容被看见，</span></span><span className="text-mask"><span className="hero-title-line">也被记住。</span></span></h1></div>
        <div className="hero-content">
          <div className="hero-intro"><p><span className="text-mask"><span className="intro-line">拥有一年短视频运营实操经验。</span></span><span className="text-mask"><span className="intro-line">从选题、剪辑到发布与复盘，</span></span><span className="text-mask"><span className="intro-line">用内容思考，也用影像表达。</span></span></p><a className="pill-button" href="#works">查看我的作品<span><ArrowRight size={19} /></span></a></div>
        </div>
        <div className="hero-bottom"><button onClick={() => setPlaying(!playing)} aria-label={playing ? '暂停背景视频' : '播放背景视频'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button></div>
      </div>
    </header>

    <div className="portfolio-content">
    <PortfolioBackground paused={!!selected} />
    <main>
      <section id="about" className="section about-section motion-module">
        <SectionTitle lines={['ABOUT ME']} />
        <div className="about-card">
          <span className="eyebrow">CONTENT. CUT. CREATE.</span>
          <h2>我是彭程兴，<br />一名短视频内容创作者。<br /><em className="font-serif">Every frame tells a story.</em></h2>
          <p className="about-copy">参与短视频拍摄、剪辑、文案、发布及账号运营，熟悉内容从制作到发布的完整流程。将 AI 工具应用于选题、文案、视觉生成与视频制作，独立完成 AI 短片创作。</p>
          <div className="profile-line"><img src={media('portrait', 'webp')} alt="彭程兴的简历照片" width="52" height="66" loading="lazy" decoding="async" /><div><strong>彭程兴</strong><span>短视频运营实习生</span></div><div className="profile-meta"><span><MapPin size={14} /> 北京市</span><span>郑州经贸学院 · 信息管理与信息系统 · 2027 届本科</span></div><a href={media('resume', 'pdf')} download="彭程兴-短视频编导.pdf" className="text-link"><Download size={16} /> 下载简历</a></div>
        </div>
        <div className="stats-grid">{stats.map(([value, label]) => <div key={label}><strong>{value}</strong><p>{label}</p></div>)}</div>
        <div className="experience motion-module" id="experience">
          <SectionTitle lines={['EXPERIENCE']} />
          <div className="experience-heading"><span className="eyebrow">EXPERIENCE & TOOLKIT</span><h3>从内容制作，<br />走到账号运营。</h3></div>
          <div className="experience-details"><div className="job-heading"><div><h4>北京星光元气科技有限公司</h4><p>短视频运营实习生</p></div><span>2025.7—2026.7</span></div><p>参与「清华陈晶聊商业」日常运营，根据内容数据优化选题方向与视频节奏；了解公域获客、直播筛选与私域承接的内容转化链路。</p><p>完成私董会员短视频 IP 样片剪辑 34 组，负责素材筛选、节奏、字幕、音乐音效，并根据客户反馈修改优化。</p><div className="skills">{['剪映', '达芬奇', 'ChatGPT', 'WorkBuddy', 'LibTV', 'TapNow'].map(skill => <span key={skill}><Check size={12} />{skill}</span>)}</div></div>
        </div>
      </section>

      <section id="works" className="section works-section bg-noise motion-module">
        <SectionTitle lines={['SELECTED', 'WORKS']} />
        <div className="works-heading"><h2>内容有很多种表达。<br /><span>这里是我的一些尝试。</span></h2></div>
        <div className="works-grid">{works.map((work, index) => <div key={work.id} className={`work-slot ${work.wide ? 'wide-work' : ''}`}><button className={`work-card ${work.wide ? 'landscape' : ''}`} onClick={event => { trigger.current = event.currentTarget; setSelected(work); }} aria-label={`播放 ${work.title}`}><div className="poster"><img src={media(`${work.id}-first-480`, 'webp')} srcSet={`${media(`${work.id}-first-480`, 'webp')} 480w, ${media(`${work.id}-first-800`, 'webp')} 800w`} sizes={work.wide ? '(max-width: 640px) calc(100vw - 44px), (max-width: 1000px) calc((100vw - 78px) * 2 / 3), (max-width: 1320px) calc((100vw - 114px) / 2), 603px' : '(max-width: 640px) calc((100vw - 57px) / 2), (max-width: 1000px) calc((100vw - 96px) / 3), (max-width: 1320px) calc((100vw - 150px) / 4), 293px'} alt={`${work.title}视频画面`} loading="lazy" decoding="async" width={work.wide ? 800 : 450} height={work.wide ? 450 : 800} /><span className="card-index">{String(index + 1).padStart(2, '0')}</span><span className="play-circle"><Play size={21} fill="currentColor" /></span><span className="duration">{work.duration}</span></div><div className="card-caption"><div><h4>{work.title}</h4><p>{work.note}</p></div><ArrowUpRight size={20} /></div></button></div>)}</div>
      </section>
    </main>

    <footer id="contact" className="section contact-section motion-module">
      <SectionTitle lines={["LET’S", 'CREATE']} />
      <div className="contact-main"><div><p className="eyebrow">短视频运营实习 · 视频内容制作</p><h2><em className="font-serif">期待下一次，<br />一起创作。</em></h2><a href={media('resume', 'pdf')} className="pill-button" download="彭程兴-短视频编导.pdf">下载完整简历<span><Download size={18} /></span></a></div><address><a href="mailto:709750034@qq.com"><span><Mail size={17} /> 邮箱</span><strong>709750034@qq.com</strong><ArrowUpRight size={20} /></a><a href="tel:+8618736536542"><span><Phone size={17} /> 手机</span><strong>187 3653 6542</strong><ArrowUpRight size={20} /></a><div><span><MapPin size={17} /> 所在地</span><strong>北京市</strong></div></address></div>
    </footer>
    </div>

    <dialog ref={dialog} className="video-dialog" onClose={() => { workVideo.current?.pause(); setSelected(null); }} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="video-title">
      {selected && <div className="dialog-inner"><div className="dialog-heading"><div><span>{selected.duration}</span><h2 id="video-title">{selected.title}</h2></div><button onClick={close} aria-label="关闭视频"><X size={24} /></button></div>{videoError ? <p className="video-error">视频暂时无法播放，请重新打开或<a href={media(selected.id)} download>下载视频</a>查看。</p> : <video ref={workVideo} key={selected.id} poster={media(`${selected.id}-first-800`, 'webp')} width={selected.wide ? 1280 : 720} height={selected.wide ? 720 : 1280} controls autoPlay playsInline preload="none" onError={() => setVideoError(true)} />}<p className="dialog-note">{selected.note}<span>按 Esc 可关闭</span></p></div>}
    </dialog>
  </>;
}
