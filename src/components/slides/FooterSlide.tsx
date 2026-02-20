'use client';

import { motion } from 'framer-motion';
import { useFullPageScroll } from '@/components/FullPageScroll';
import Image from 'next/image';

interface FooterSlideProps {
  index: number;
}

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.77, 0, 0.18, 1] as any
    }
  }
};

export default function FooterSlide({ index }: FooterSlideProps) {
  const { currentIndex, goTo } = useFullPageScroll();
  const isActive = currentIndex === index;

  const navLinks = [
    { label: 'Главная', slideIndex: 0 },
    { label: 'О нас', slideIndex: 1 },
    { label: 'Принципы', slideIndex: 2 },
    { label: 'Услуги', slideIndex: 3 },
    { label: 'Портфолио', slideIndex: 4 },
    { label: 'Кабинет', slideIndex: 5 },
    { label: 'Команда', slideIndex: 6 },
    { label: 'Контакты', slideIndex: 7 }
  ];

  const contacts = [
    { label: 'Телефон', value: '+7 921 952-61-17', href: 'tel:+79219526117' },
    { label: 'Email', value: 'info@tashi-ani.ru', href: 'mailto:info@tashi-ani.ru' },
    { label: 'Адрес', value: 'Санкт-Петербург' }
  ];

  return (
    <section
      className="footer-slide"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '5vh 5%',
        background: '#0A0D07',
        color: 'var(--warm-white)'
      }}
    >
      <motion.div
        initial="hidden"
        animate={isActive ? "visible" : "hidden"}
        variants={containerVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem'
        }}
      >
        {/* Логотип и описание */}
        <motion.div variants={itemVariants}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Image
              src="/logo_new_no_back.png"
              alt="ТАШИ-АНИ"
              width={44}
              height={44}
            />
            <div>
              <div style={{ 
                fontFamily: 'var(--font-cormorant)',
                fontSize: '1.25rem',
                fontWeight: 400,
                color: 'var(--warm-white)'
              }}>
                ТАШИ-АНИ
              </div>
              <div style={{ 
                fontSize: '0.75rem',
                color: 'var(--stone)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Строительная компания
              </div>
            </div>
          </div>
          <p style={{
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--stone)',
            maxWidth: '300px'
          }}>
            Профессиональное управление строительными проектами с 2010 года
          </p>
        </motion.div>

        {/* Навигация */}
        <motion.div variants={itemVariants}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 400,
            color: 'var(--gold)',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Навигация
          </h3>
          <nav style={{
            display: 'grid',
            gap: '0.75rem'
          }}>
            {navLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={() => goTo(link.slideIndex)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--stone)',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '0',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--warm-white)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--stone)';
                }}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Контакты */}
        <motion.div variants={itemVariants}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 400,
            color: 'var(--gold)',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Контакты
          </h3>
          <div style={{
            display: 'grid',
            gap: '1.25rem'
          }}>
            {contacts.map((contact, idx) => (
              <div key={idx}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--stone)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '0.25rem'
                }}>
                  {contact.label}
                </div>
                {contact.href ? (
                  <a
                    href={contact.href}
                    style={{
                      fontSize: '1rem',
                      color: 'var(--warm-white)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--warm-white)';
                    }}
                  >
                    {contact.value}
                  </a>
                ) : (
                  <div style={{
                    fontSize: '1rem',
                    color: 'var(--warm-white)'
                  }}>
                    {contact.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Нижняя часть футера */}
      <motion.div
        variants={itemVariants}
        style={{
          paddingTop: '2rem',
          borderTop: '1px solid rgba(201, 169, 110, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.875rem',
          color: 'var(--stone)'
        }}
      >
        <div>
          © 2025 ТАШИ-АНИ · Строительная компания
        </div>
        <div style={{
          display: 'flex',
          gap: '2rem'
        }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--stone)',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.875rem',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--warm-white)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--stone)';
            }}
          >
            Политика конфиденциальности
          </button>
        </div>
      </motion.div>
    </section>
  );
}
