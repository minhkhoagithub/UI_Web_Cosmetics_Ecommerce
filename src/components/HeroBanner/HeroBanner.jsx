import React from 'react';
import heroBanner from "/images/hero-banner.jpg";
import { motion } from "framer-motion";

const HeroBanner = () => {
    return (
        <section className='relative w-full h-[70vh] min-h-100 overflow-hidden'>
            <img
                src={heroBanner}
                className='w-full h-full object-cover'
                alt="E-Shop Fashion collection"
            />
            <div className="absolute inset-0 bg-foreground/50"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <motion.p 
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className='text-primary-foreground/70 font-body text-sm tracking-[0.3em] uppercase mb-4'>
                    New Collection 2026
                </motion.p>
                
                <motion.h2 className="font-display text-4xl md:text-6xl lg:text-7xl text-primary-foreground font-semibold mb-6">
                    Redefine Your Style
                </motion.h2>
                <motion.button
                initial={{opacity: 0, y: 20}}
                animate={{opacity:1 , y: 0}}
                transition={{delay: 0.6}}
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                className='bg-primary-foreground text-primary font-body text-sm tracking-widest uppercase px-10 py-4 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 cursor-pointer'
                >
                    Explore Now
                </motion.button>
            </div>
        </section>
    );
};

export default HeroBanner;