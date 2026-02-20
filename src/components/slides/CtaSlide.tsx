'use client';

import { motion } from 'framer-motion';
import { useFullPageScroll } from '@/components/FullPageScroll';

interface CtaSlideProps {
  index: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.77, 0, 0.18, 1] as any
    }
  }
};

export default function CtaSlide({ index }: CtaSlideProps) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;

  return (
    <section
      className="cta-slide"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5vh 5%',
        background: 'var(--ink)',
        color: 'var(--warm-white)',
        textAlign: 'center'
      }}
    >
      <motion.div
        initial="hidden"
        animate={isActive ? "visible" : "hidden"}
        variants={containerVariants}
        style={{
          maxWidth: '700px',
          width: '100%'
        }}
      >
        {/* Цитата клиента */}
        <motion.blockquote
          variants={itemVariants}
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            fontStyle: 'italic',
            fontWeight: 300,
            lineHeight: 1.6,
            color: 'var(--stone)',
            marginBottom: '2rem',
            position: 'relative',
            padding: '0 2rem'
          }}
        >
          <span style={{ 
            position: 'absolute', 
            left: 0, 
            top: '-10px',
            fontSize: '4rem', 
            color: 'var(--gold)',
            opacity: 0.3,
            fontFamily: 'Georgia, serif'
          }}>
            "
          </span>
          Работа с ТАШИ-АНИ — это гарантия качества и соблюдения сроков. 
          Профессиональный подход на каждом этапе строительства.
          <span style={{ 
            position: 'absolute', 
            right: 0, 
            bottom: '-30px',
            fontSize: '4rem', 
            color: 'var(--gold)',
            opacity: 0.3,
            fontFamily: 'Georgia, serif'
          }}>
            "
          </span>
        </motion.blockquote>

        <motion.p
          variants={itemVariants}
          style={{
            fontSize: '0.95rem',
            color: 'var(--stone)',
            marginBottom: '4rem',
            fontStyle: 'italic'
          }}
        >
          — Александр М., застройщик
        </motion.p>

        {/* Основной CTA */}
        <motion.h2
          variants={itemVariants}
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 300,
            lineHeight: 1.2,
            color: 'var(--warm-white)',
            marginBottom: '3rem'
          }}
        >
          Готовы обсудить ваш проект?
        </motion.h2>

        {/* Кнопки */}
        <motion.div
          variants={containerVariants}
          style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          <motion.a
            variants={itemVariants}
            href="tel:+79219526117"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '1.25rem 3rem',
              background: 'var(--gold)',
              border: 'none',
              color: 'var(--ink)',
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '2px',
              textDecoration: 'none',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--warm-white)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--gold)';
            }}
          >
            Позвонить нам
          </motion.a>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '1.25rem 3rem',
              background: 'transparent',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              fontSize: '1rem',
              fontWeight: 400,
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '2px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(201, 169, 110, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Написать →
          </motion.button>
        </motion.div>

        {/* Контактная информация */}
        <motion.div
          variants={itemVariants}
          style={{
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(201, 169, 110, 0.2)'
          }}
        >
          <p style={{ 
            fontSize: '1.125rem',
            color: 'var(--warm-white)',
            marginBottom: '0.5rem',
            fontWeight: 400
          }}>
            +7 921 952-61-17
          </p>
          <p style={{ 
            fontSize: '0.95rem',
            color: 'var(--stone)'
          }}>
            Ежедневно с 9:00 до 21:00
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
