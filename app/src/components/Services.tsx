import styles from './Services.module.css';

const services = [
    {
        title: "Móviles",
        description: "Reparación de pantallas, baterías y conectores de todas las marcas.",
        icon: "📱"
    },
    {
        title: "Tablets",
        description: "Solución a problemas de carga, pantalla y software en iPad y Android.",
        icon: "📟"
    },
    {
        title: "Ordenadores",
        description: "Mantenimiento y reparación de Laptops y PC de escritorio.",
        icon: "💻"
    },
    {
        title: "Accesorios",
        description: "Venta de fundas, cargadores y protectores de última generación.",
        icon: "🔌"
    }
];

export default function Services() {
    return (
        <section id="servicios" className="section-padding">
            <div className="container">
                <h2 className={styles.heading}>Nuestros <span className="text-gradient">Servicios</span></h2>
                <div className="grid-responsive">
                    {services.map((service, index) => (
                        <div key={index} className={`${styles.card} glass`}>
                            <div className={styles.icon}>{service.icon}</div>
                            <h3 className={styles.title}>{service.title}</h3>
                            <p className={styles.description}>{service.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
