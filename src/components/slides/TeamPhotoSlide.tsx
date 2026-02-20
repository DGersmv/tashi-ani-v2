'use client';

import { motion } from 'framer-motion';
import { useFullPageScroll } from '@/components/FullPageScroll';
import Image from 'next/image';

interface TeamPhotoSlideProps {
  index: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.77, 0, 0.18, 1] as any
    }
  }
};

export default function TeamPhotoSlide({ index }: TeamPhotoSlideProps) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;

  return (
    <section
      className="team-photo-slide"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Фоновое изображение */}
      <Image
        src="/images/land-02.jpg"
        alt="Команда ТАШИ-АНИ"
        fill
        style={{
          objectFit: 'cover',
          objectPosition: 'center 35%'
        }}
        priority
      />

      {/* Градиентный оверлей */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(28,27,22,0.85) 0%, rgba(28,27,22,0.4) 60%, transparent 100%)',
          zIndex: 1
        }}
      />

      {/* Контент */}
      <motion.div
        initial="hidden"
        animate={isActive ? "visible" : "hidden"}
        variants={containerVariants}
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 5%',
          maxWidth: '600px'
        }}
      >
        <motion.p
          variants={itemVariants}
          style={{
            fontSize: '0.875rem',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '1.5rem',
            fontWeight: 300
          }}
        >
          Команда мечты
        </motion.p>

        <motion.h2
          variants={itemVariants}
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: 300,
            lineHeight: 1.2,
            color: 'var(--warm-white)',
            marginBottom: '2rem'
          }}
        >
          Профессиональная команда ТАШИ-АНИ
        </motion.h2>

        <motion.p
          variants={itemVariants}
          style={{
            fontSize: '1.125rem',
            lineHeight: 1.7,
            color: 'var(--cream)',
            marginBottom: '3rem',
            maxWidth: '500px'
          }}
        >
          15 лет опыта в строительстве и проектном менеджменте. 
          Более 200 успешно реализованных проектов по всей России.
        </motion.p>

        {/* Статистика */}
        <motion.div
          variants={containerVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '2rem',
            maxWidth: '500px'
          }}
        >
          {[
            { value: '15+', label: 'лет опыта' },
            { value: '200+', label: 'проектов' },
            { value: '95%', label: 'довольных клиентов' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  fontFamily: 'var(--font-cormorant)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  marginBottom: '0.5rem'
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--stone)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
