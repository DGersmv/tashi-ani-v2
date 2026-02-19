'use client';

import { motion } from 'framer-motion';
import { useFullPageScroll } from '@/components/FullPageScroll';

interface CabinetSlideProps {
  index: number;
}

const features = [
  {
    icon: '📊',
    title: 'Онлайн-отчётность',
    description: 'Актуальная информация о ходе работ в режиме реального времени'
  },
  {
    icon: '📸',
    title: 'Фотофиксация',
    description: 'Детальная визуальная документация каждого этапа строительства'
  },
  {
    icon: '📁',
    title: 'Документооборот',
    description: 'Вся проектная документация в одном безопасном месте'
  },
  {
    icon: '💬',
    title: 'Обратная связь',
    description: 'Прямая коммуникация с командой проекта'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

export default function CabinetSlide({ index }: CabinetSlideProps) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;

  return (
    <section
      className="cabinet-slide"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 5%',
        background: 'var(--moss)',
        color: 'var(--warm-white)'
      }}
    >
      <motion.div
        initial="hidden"
        animate={isActive ? "visible" : "hidden"}
        variants={containerVariants}
        style={{
          width: '100%',
          maxWidth: '1400px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '4rem',
          alignItems: 'center'
        }}
      >
        {/* Левая часть: текст и описание */}
        <motion.div variants={containerVariants}>
          <motion.p
            variants={itemVariants}
            style={{
              fontSize: '0.875rem',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontWeight: 300
            }}
          >
            Личный кабинет
          </motion.p>
          
          <motion.h2
            variants={itemVariants}
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 300,
              lineHeight: 1.2,
              marginBottom: '2rem',
              color: 'var(--warm-white)'
            }}
          >
            Прозрачность на каждом этапе
          </motion.h2>

          <motion.p
            variants={itemVariants}
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.7,
              color: 'var(--cream)',
              marginBottom: '3rem',
              maxWidth: '500px'
            }}
          >
            Современная система управления проектами позволяет нашим клиентам
            быть в курсе всех процессов строительства 24/7
          </motion.p>

          {/* Преимущества */}
          <motion.div
            variants={containerVariants}
            style={{
              display: 'grid',
              gap: '1.5rem'
            }}
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    flexShrink: 0
                  }}
                >
                  {feature.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-cormorant)',
                      fontSize: '1.25rem',
                      fontWeight: 400,
                      marginBottom: '0.5rem',
                      color: 'var(--warm-white)'
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      color: 'var(--stone)',
                      fontWeight: 300
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{
              marginTop: '3rem'
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '1rem 2.5rem',
                background: 'var(--gold)',
                border: 'none',
                color: 'var(--ink)',
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                borderRadius: '2px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--warm-white)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--gold)';
              }}
            >
              Демо-доступ
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Правая часть: мокап интерфейса */}
        <motion.div
          variants={itemVariants}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/10',
            background: 'linear-gradient(135deg, rgba(28,27,22,0.6) 0%, rgba(28,27,22,0.9) 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(201, 169, 110, 0.2)',
            padding: '2rem',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}
        >
          {/* Мокап окна браузера */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(250, 247, 242, 0.95)',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
          >
            {/* Header окна */}
            <div
              style={{
                height: '36px',
                background: 'rgba(28,27,22,0.95)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                gap: '0.5rem'
              }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF5F56' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFBD2E' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27C93F' }} />
            </div>

            {/* Контент мокапа */}
            <div
              style={{
                padding: '2rem',
                height: 'calc(100% - 36px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >
              {/* Dashboard header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    height: '24px',
                    width: '60%',
                    background: 'linear-gradient(90deg, var(--moss) 0%, var(--sage) 100%)',
                    borderRadius: '4px',
                    opacity: 0.8
                  }}
                />
                <div
                  style={{
                    height: '32px',
                    width: '32px',
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    opacity: 0.6
                  }}
                />
              </div>

              {/* Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  flex: 1
                }}
              >
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    style={{
                      background: 'rgba(122, 158, 114, 0.15)',
                      borderRadius: '6px',
                      padding: '1rem',
                      border: '1px solid rgba(58, 82, 54, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div
                      style={{
                        height: '16px',
                        width: '70%',
                        background: 'var(--moss)',
                        borderRadius: '3px',
                        opacity: 0.6
                      }}
                    />
                    <div
                      style={{
                        height: '12px',
                        width: '50%',
                        background: 'var(--sage)',
                        borderRadius: '3px',
                        opacity: 0.4
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Декоративный элемент */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(201,169,110,0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
