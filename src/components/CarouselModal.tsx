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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 998,
            background: 'rgba(0, 0, 0, 0.05)', /* nearly transparent overlay */
            pointerEvents: 'auto'
          }}
          onClick={onClose}
        >
          {/* Render carousel directly - it will handle all UI including close button */}
          <div
            onClick={e => e.stopPropagation()}
            onWheel={handleWheel}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999
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
              <DiagonalCarousel images={images} onExit={onClose} />
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
      )}
    </AnimatePresence>
  );
}
