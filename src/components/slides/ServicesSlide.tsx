'use client';

import { motion } from 'framer-motion';
import { useFullPageScroll } from '@/components/FullPageScroll';

interface ServicesSlideProps {
  index: number;
}

const services = [
  {
    icon: '🏗️',
    title: 'Проектное администрирование',
    description: 'Контроль всех этапов строительства от начала до конца'
  },
  {
    icon: '📐',
    title: 'Авторский надзор и сопровождение',
    description: 'Обеспечение соответствия проекта авторскому замыслу'
  },
  {
    icon: '🔍',
    title: 'Экспертиза',
    description: 'Профессиональная оценка проектной документации'
  },
  {
    icon: '📊',
    title: 'Управление сметой и бюджетом',
    description: 'Оптимизация расходов без потери качества'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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
      duration: 0.6,
      ease: [0.77, 0, 0.18, 1] as any
    }
  }
};

export default function ServicesSlide({ index }: ServicesSlideProps) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;

  return (
    <section
      className="services-slide"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 5%',
        background: 'rgba(19,21,15,0.92)',
        color: 'var(--warm-white)'
      }}
    >
      <motion.div
        initial="hidden"
        animate={isActive ? "visible" : "hidden"}
        variants={containerVariants}
        style={{
          width: '100%',
          maxWidth: '1200px'
        }}
      >
        {/* Заголовок */}
        <motion.div
          variants={itemVariants}
          style={{
            marginBottom: '4rem',
            textAlign: 'center'
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontWeight: 300
            }}
          >
            Наши услуги
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 300,
              lineHeight: 1.2,
              color: 'var(--warm-white)'
            }}
          >
            Профессиональное управление проектами
          </h2>
        </motion.div>

        {/* Сетка услуг 2×2 */}
        <motion.div
          variants={containerVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            width: '100%'
          }}
        >
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
              style={{
                padding: '2.5rem 2rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(201, 169, 110, 0.15)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(58, 82, 54, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '1.5rem'
                }}
              >
                {service.icon}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  marginBottom: '1rem',
                  color: 'var(--warm-white)'
                }}
              >
                {service.title}
              </h3>
              <p
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  color: 'var(--stone)',
                  fontWeight: 300
                }}
              >
                {service.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
