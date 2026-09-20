import React from 'react'
import Hero from '../components/Hero/Hero'
import SomaIntro from '../components/soma/SomaIntro'
import SomaMethod from '../components/soma/SomaMethod'
import SomaExperiences from '../components/soma/SomaExperiences'
import SomaImmersive from '../components/soma/SomaImmersive'
import SomaTeam from '../components/soma/SomaTeam'
import SomaTestimonials from '../components/soma/SomaTestimonials'
import SomaCTA from '../components/soma/SomaCTA'
import { useScrollToSection } from '../hooks/useScrollToSection';

const Home = () => {
  useScrollToSection();
  return (
    <div>
      <Hero />
      <SomaIntro />
      <SomaMethod />
      <SomaExperiences />
      <SomaImmersive />
      <SomaTeam />
      <SomaTestimonials />
      <SomaCTA />
    </div>
  )
}

export default Home
