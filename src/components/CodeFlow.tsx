import React, { useEffect, useRef } from 'react';

export const CodeFlow: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    // Particle system
    const particles: Particle[] = [];
    const particleCount = 60;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      text: string;

      constructor() {
        this.reset();
      }

      reset() {
        // Start from edges or random positions
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // Top
          this.x = Math.random() * width;
          this.y = -20;
        } else if (side === 1) { // Right
          this.x = width + 20;
          this.y = Math.random() * height;
        } else if (side === 2) { // Bottom
          this.x = Math.random() * width;
          this.y = height + 20;
        } else { // Left
          this.x = -20;
          this.y = Math.random() * height;
        }

        this.size = Math.random() * 12 + 8;
        
        // Move towards center
        const targetX = width / 2 + (Math.random() - 0.5) * 200;
        const targetY = height / 2 + (Math.random() - 0.5) * 200;
        
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const speed = Math.random() * 1.5 + 0.5;
        
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        this.opacity = 0;
        
        const codeSnippets = ['01', 'AI', '=>', '{}', 'func', 'var', 'ptr', 'log', 'exec'];
        this.text = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Fade in
        if (this.opacity < 0.6) this.opacity += 0.01;

        // Distance to center
        const dist = Math.hypot(this.x - width / 2, this.y - height / 2);
        
        // Fade out as it gets very close to center or goes off screen
        if (dist < 50 || this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
          this.opacity -= 0.02;
          if (this.opacity <= 0) {
            this.reset();
          }
        }
      }

      draw() {
        if (!ctx) return;
        ctx.font = `${this.size}px monospace`;
        ctx.fillStyle = `rgba(6, 182, 212, ${this.opacity})`;
        ctx.fillText(this.text, this.x, this.y);
        
        // Add a subtle glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw background radial gradient for "backlight"
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.6
      );
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-40"
    />
  );
};
