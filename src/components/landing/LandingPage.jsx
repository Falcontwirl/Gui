import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import NavBar from './NavBar';
import HeroSection from './HeroSection';
import TrustBar from './TrustBar';
import FeaturesSection from './FeaturesSection';
import HowItWorks from './HowItWorks';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import CTASection from './CTASection';
import Footer from './Footer';

export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const goToApp = useCallback(() => navigate('/upload'), [navigate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      setNavScrolled(el.scrollTop > 10);
      setScrollProgress(Math.min(el.scrollTop / window.innerHeight, 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--color-bg-base)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.6,
      }}
    >
      <NavBar onGetStarted={goToApp} scrolled={navScrolled} />
      <HeroSection onGetStarted={goToApp} scrollProgress={scrollProgress} />
      <TrustBar />
      <FeaturesSection />
      <HowItWorks />
      <Testimonials />
      <Pricing onGetStarted={goToApp} />
      <CTASection onGetStarted={goToApp} />
      <Footer />
    </div>
  );
}
