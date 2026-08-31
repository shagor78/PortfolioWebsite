/* ==========================================================================
   EDITABLE CONTENT — add your Projects and Blog posts here.
   Everything below is plain data; the site renders it automatically.
   ========================================================================== */

window.SITE_DATA = {

  /* ------------------------------------------------------------------
     PROJECTS
     Add a new block inside "projects: [ ]" for each project card.
     Copy this template:

     {
       title: "My Project Title",
       category: "devops",            // networking | systems | cloud | devops | security
       image: "assets/images/projects/my-project.jpg",  // or "" for a gradient cover
       gradient: "gradient-tech",     // fallback cover style (see CSS)
       problem: "What problem existed.",
       solution: "How I solved it.",
       role: "DevOps & Cloud Engineer",
       contribution: "Key thing I contributed.",
       tech: ["Docker", "Linux"],
       github: "",                    // e.g. "https://github.com/username/repo" (leave "" to hide)
       demo: ""                       // live demo URL (leave "" to hide)
     }
  ------------------------------------------------------------------ */
  projects: [],

  /* ------------------------------------------------------------------
     BLOG / PERSONAL FEED
     Add a new block inside "posts: [ ]". Newest post = first in list.

     {
       title: "Weekend in Dhaka",
       caption: "Sometimes stepping away from servers and terminals is exactly what you need.",
       date: "August 16, 2026",
       location: "Dhaka, Bangladesh",   // optional — remove line if not needed
       category: "life",                // life | travel | technology | career | learning | photography
       image: "",                       // e.g. "assets/images/blog/weekend.jpg" (or "" for gradient)
       gradient: "gradient-life",       // life | travel | tech | career | learning | photography
       tags: ["weekend", "dhaka"]
     }
  ------------------------------------------------------------------ */
  posts: [
    {
      title: "Weekend in Dhaka 🌆",
      caption: "Sometimes stepping away from servers and terminals is exactly what you need.",
      date: "August 16, 2026",
      location: "Dhaka, Bangladesh",
      category: "life",
      image: "",
      gradient: "gradient-life",
      tags: ["weekend", "dhaka"]
    },
    {
      title: "Learning Kubernetes 🚀",
      caption: "Spent the weekend experimenting with containers, deployments and services.",
      date: "August 9, 2026",
      category: "learning",
      image: "",
      gradient: "gradient-learning",
      tags: ["kubernetes", "containers", "learning"]
    }
  ]
};
