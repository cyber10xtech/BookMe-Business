import barbers from "@/assets/categories/barbers.jpg";
import cakeVendors from "@/assets/categories/cake-vendors.jpg";
import catering from "@/assets/categories/catering.jpg";
import generatorMechanics from "@/assets/categories/generator-mechanics.png";
import djs from "@/assets/categories/djs.jpg";
import eventPlanners from "@/assets/categories/event-planners.jpg";
import hairdressers from "@/assets/categories/hairdressers.jpg";
import makeupArtists from "@/assets/categories/makeup-artists.jpg";
import mechanics from "@/assets/categories/mechanics.jpg";
import photographers from "@/assets/categories/photographers.jpg";
import tattooArtists from "@/assets/categories/tattoo-artists.jpg";
import petServices from "@/assets/categories/pet-services.jpg";
import lashTechs from "@/assets/categories/lash-techs.jpg";
import personalTrainers from "@/assets/categories/personal-trainers.jpg";
import cleaningServices from "@/assets/categories/cleaning-services.jpg";
import lessonTeachers from "@/assets/categories/lesson-teachers.jpg";

export const CATEGORIES = [
  { id: "barbers", label: "Barbers", image: barbers },
  { id: "cake_vendors", label: "Cake Vendors", image: cakeVendors },
  { id: "caterers", label: "Caterers", image: catering },
  { id: "cleaning_services", label: "Cleaning Services", image: cleaningServices },
  { id: "generator_mechanics", label: "Generator Mechanics", image: generatorMechanics },
  { id: "djs", label: "DJs", image: djs },
  { id: "event_planners", label: "Event Planners", image: eventPlanners },
  { id: "hairdressers", label: "Hairdressers", image: hairdressers },
  { id: "lash_techs", label: "Lash Techs", image: lashTechs },
  { id: "lesson_teachers", label: "Lesson Teachers", image: lessonTeachers },
  { id: "makeup_artists", label: "Makeup Artists", image: makeupArtists },
  { id: "mechanics", label: "Mechanics", image: mechanics },
  { id: "personal_trainers", label: "Personal Trainers", image: personalTrainers },
  { id: "pet_services", label: "Pet Services", image: petServices },
  { id: "photographers", label: "Photographers", image: photographers },
  { id: "tattoo_artists", label: "Tattoo Artists", image: tattooArtists },
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];
