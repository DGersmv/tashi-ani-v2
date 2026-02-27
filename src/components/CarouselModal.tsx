'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DiagonalCarousel from '@/components/Scrollcarousel3d';

interface CarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: string;
  title: string;
}

export default function CarouselModal({ isOpen, onClose, folder, title }: CarouselModalProps) {
  const [images, setImages] = useState<Array<{ src: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && folder) {
      setLoading(true);
      fetch(`/api/carousel/${folder}`)
        .then(res => res.json())
        .then(data => {
          if (data.images) {
            setImages(data.images);
          }
        })
        .catch(err => {
          console.error('Failed to load carousel images:', err);
          setImages([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, folder]);

  // Блокируем прокрутку страницы когда модаль открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Блокируем wheel события от распространения на FullPageScroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backrop с убедительным закрытием */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 998,
              cursor: 'pointer'
            }}
          />

          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onWheel={handleWheel}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'auto'
            }}
            onClick={onClose}  // щелчок по модалке закрывает
          >
            {/* Заголовок и кнопка закрытия */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                padding: '2rem',
                background: 'rgba(28, 27, 22, 0.95)',
                borderBottom: '1px solid rgba(232, 226, 216, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1001
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: '2rem',
                    color: 'var(--warm-white)',
                    margin: '0 0 0.5rem 0'
                  }}
                >
                  {title}
                </h2>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(232, 226, 216, 0.5)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    margin: 0
                  }}
                >
                  ESC или клик на фон для закрытия
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--warm-white)',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  transition: 'color 0.3s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--warm-white)')}
              >
                ✕
              </button>
            </div>

            {/* Контент модали (остановка клика чтобы он не закрывал) */}
            <div
              onClick={e => e.stopPropagation()}
              onWheel={handleWheel}
              style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--ink)'
              }}
            >
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--warm-white)',
                    fontSize: '1.5rem'
                  }}
                >
                  Загрузка...
                </div>
              ) : images.length > 0 ? (
                <DiagonalCarousel images={images} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--stone)',
                    fontSize: '1.2rem'
                  }}
                >
                  Нет изображений
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
