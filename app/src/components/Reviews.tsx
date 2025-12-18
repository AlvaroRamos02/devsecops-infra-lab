import styles from './Reviews.module.css';

const reviews = [
    {
        id: 1,
        name: "Carlos M.",
        initial: "C",
        text: "Increíble servicio. Me arreglaron la pantalla del iPhone en menos de una hora. Muy profesionales y el precio me pareció justo para la calidad.",
        stars: "★★★★★"
    },
    {
        id: 2,
        name: "Laura G.",
        initial: "L",
        text: "Pensé que mi portátil no tenía solución, pero en MazCom lograron recuperar mis datos y hacerlo funcionar de nuevo. ¡Mil gracias!",
        stars: "★★★★★"
    },
    {
        id: 3,
        name: "David R.",
        initial: "D",
        text: "Atención al cliente de 10. Te explican todo claro y sin tecnicismos. Se nota que saben lo que hacen. Recomendado 100%.",
        stars: "★★★★★"
    }
];

export default function Reviews() {
    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={`${styles.title} text-gradient`}>Lo que dicen nuestros clientes</h2>
                <div className={styles.grid}>
                    {reviews.map((review) => (
                        <div key={review.id} className={`${styles.card} glass`}>
                            <div className={styles.header}>
                                <div className={styles.avatar}>{review.initial}</div>
                                <div className={styles.info}>
                                    <span className={styles.name}>{review.name}</span>
                                    <span className={styles.stars}>{review.stars}</span>
                                </div>
                            </div>
                            <p className={styles.text}>"{review.text}"</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
