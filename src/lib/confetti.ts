export const fireConfetti = () => {
  const container = document.body;
  const colors = ["#D4AF37", "#C5961D", "#E6C547", "#B8860B", "#FFD700", "#FFF8DC"];
  const shapes = ["circle", "rect"];
  const count = 60;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = Math.random() * 10 + 5;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    Object.assign(el.style, {
      position: "fixed",
      zIndex: "99999",
      width: `${size}px`,
      height: shape === "rect" ? `${size * 0.6}px` : `${size}px`,
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      borderRadius: shape === "circle" ? "50%" : "2px",
      left: `${Math.random() * 100}vw`,
      top: "-20px",
      pointerEvents: "none",
      opacity: "1",
    });

    container.appendChild(el);

    const duration = 1500 + Math.random() * 1500;
    const drift = (Math.random() - 0.5) * 200;
    const rotation = Math.random() * 720 - 360;

    el.animate(
      [
        { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
        { transform: `translateY(100vh) translateX(${drift}px) rotate(${rotation}deg)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", fill: "forwards" }
    );

    setTimeout(() => el.remove(), duration);
  }
};
