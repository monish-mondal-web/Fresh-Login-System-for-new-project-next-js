import React from 'react';

interface HeroProps {
  onStartBuilding: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartBuilding }) => {
  return (
    <section className="w-full flex-1 flex flex-col items-center justify-center text-center px-4 pt-24 pb-32 z-10 relative">
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-text leading-[1.1] mb-6">
        Build job-ready resumes in seconds
      </h1>
      <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl">
        AI-powered resumes tailored for every job. Land your dream role with minimal effort.
      </p>
      
      <button
        onClick={onStartBuilding}
        className="cursor-pointer px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 duration-200"
      >
        Start Building
      </button>
      
      <p className="mt-4 text-sm text-gray-400 font-medium">
        No signup required
      </p>
    </section>
  );
};
