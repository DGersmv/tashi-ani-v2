'use client';

import { motion } from 'framer-motion';
import { useFullPageScroll } from '@/components/FullPageScroll';
import Image from 'next/image';

interface PortfolioSlideProps {
  index: number;
}

const projects = [
  {
    id: 1,
    title: 'Административный комплекс',
    location: 'Санкт-Петербург',
    year: '2024',
    image: '/images/land-01.jpg'
  },
  {
    id: 2,
    title: 'Жилой комплекс премиум-класса',
    location: 'Москва',
    year: '2023',
    image: '/images/land-02.jpg'
  },
  {
    id: 3,
    title: 'Торгово-развлекательный центр',
    location: 'Казань',
    year: '2023',
    image: '/images/land-03.jpg'
  },
  {
    id: 4,
    title: 'Бизнес-центр класса А',
    location: 'Санкт-Петербург',
    year: '2022',
    image: '/images/land-01.jpg'
  }
];

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
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: [0.77, 0, 0.18, 1] as any
    }
  }
};

export default function PortfolioSlide({ index }: PortfolioSlideProps) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;

  return (
    <section
      className="portfolio-slide"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 5%',
        background: 'var(--ink)',
        color: 'var(--warm-white)',
        overflow: 'hidden'
      }}
    >
      <motion.div
        initial="hidden"
        animate={isActive ? "visible" : "hidden"}
        variants={containerVariants}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Заголовок */}
        <motion.div
          variants={itemVariants}
          style={{
            marginBottom: '3rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          <div>
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
              Портфолио
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
              Реализованные проекты
            </h2>
          </div>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '1rem 2.5rem',
              background: 'transparent',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              fontSize: '0.95rem',
              fontWeight: 400,
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '2px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gold)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--gold)';
            }}
          >
            Все проекты →
          </motion.button>
        </motion.div>

        {/* Горизонтальная галерея */}
        <motion.div
          variants={containerVariants}
          style={{
            display: 'flex',
            gap: '3px',
            height: 'calc(100vh - 300px)',
            maxHeight: '600px',
            overflow: 'hidden'
          }}
        >
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              variants={itemVariants}
              whileHover={{
                flex: 1.08,
                transition: { duration: 0.4, ease: [0.77, 0, 0.18, 1] }
              }}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'flex 0.4s cubic-bezier(0.77, 0, 0.18, 1)'
              }}
            >
              {/* Изображение с CSS-градиентом */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(180deg, rgba(28,27,22,0) 0%, rgba(28,27,22,0.4) 50%, rgba(28,27,22,0.9) 100%)`,
                  zIndex: 1
                }}
              />
              
              <Image
                src={project.image}
                alt={project.title}
                fill
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: 'grayscale(0.3)'
                }}
                priority={idx < 2}
              />

              {/* Оверлей с информацией (появляется при hover) */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(58, 82, 54, 0.75)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '2rem',
                  textAlign: 'center'
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: '2rem',
                    fontWeight: 400,
                    color: 'var(--warm-white)',
                    marginBottom: '1rem'
                  }}
                >
                  {project.title}
                </h3>
                <p
                  style={{
                    fontSize: '1rem',
                    color: 'var(--stone)',
                    marginBottom: '0.5rem'
                  }}
                >
                  {project.location}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--gold)',
                    letterSpacing: '1px'
                  }}
                >
                  {project.year}
                </p>
              </motion.div>

              {/* Название проекта внизу */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '1.5rem',
                  zIndex: 2
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: '1.25rem',
                    color: 'var(--warm-white)',
                    fontWeight: 400
                  }}
                >
                  {project.title}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
