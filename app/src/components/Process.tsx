import styles from './Process.module.css';

const steps = [
    {
        id: 1,
        title: "Cita Previa",
        desc: "Contáctanos por WhatsApp para agendar tu visita. Sin esperas innecesarias.",
        icon: "1"
    },
    {
        id: 2,
        title: "Diagnóstico",
        desc: "Revisamos tu dispositivo y te damos un presupuesto claro y sin sorpresas.",
        icon: "2"
    },
    {
        id: 3,
        title: "Reparación",
        desc: "Técnicos expertos reparan tu equipo usando repuestos de alta calidad.",
        icon: "3"
    },
    {
        id: 4,
        title: "Entrega",
        desc: "Recoges tu dispositivo funcionando como nuevo y con garantía.",
        icon: "4"
    }
];

export default function Process() {
    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={`${styles.title} text-gradient`}>Cómo Trabajamos</h2>
                <div className={styles.steps}>
                    {steps.map((step) => (
                        <div key={step.id} className={styles.step}>
                            <div className={styles.iconWrapper}>
                                {step.icon}
                            </div>
                            <div>
                                <h3 className={styles.stepTitle}>{step.title}</h3>
                                <p className={styles.stepDesc}>{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
