import React from "react";
import { Link } from "react-router-dom";
import { LuLayoutDashboard, LuArrowRight, LuExternalLink, LuSearch } from "react-icons/lu";

const landingPages = [
  { slug: "personal-yoga-classes-malviya-nagar", title: "Personal Yoga Classes - Malviya Nagar", category: "Personal", location: "Malviya Nagar" },
  { slug: "kids-yoga-malviya-nagar", title: "Kids Yoga - Malviya Nagar", category: "Kids", location: "Malviya Nagar" },
  { slug: "prenatal-yoga-malviya-nagar", title: "Prenatal Yoga - Malviya Nagar", category: "Prenatal", location: "Malviya Nagar" },
  { slug: "yoga-for-stress-malviya-nagar", title: "Yoga for Stress - Malviya Nagar", category: "Stress Relief", location: "Malviya Nagar" },
  { slug: "corporate-yoga-malviya-nagar", title: "Corporate Yoga - Malviya Nagar", category: "Corporate", location: "Malviya Nagar" },
  { slug: "therapeutic-yoga-malviya-nagar", title: "Therapeutic Yoga - Malviya Nagar", category: "Therapeutic", location: "Malviya Nagar" },
  { slug: "online-yoga-classes-in-india", title: "Online Yoga Classes in India", category: "Online", location: "India" },
  { slug: "best-yoga-classes-jaipur", title: "Best Yoga Classes in Jaipur", category: "General", location: "Jaipur" },
  { slug: "personal-yoga-classes-durgapura", title: "Personal Yoga Classes - Durgapura", category: "Personal", location: "Durgapura" },
  { slug: "kids-yoga-durgapura", title: "Kids Yoga - Durgapura", category: "Kids", location: "Durgapura" },
  { slug: "prenatal-yoga-durgapura", title: "Prenatal Yoga - Durgapura", category: "Prenatal", location: "Durgapura" },
  { slug: "yoga-for-stress-durgapura", title: "Yoga for Stress - Durgapura", category: "Stress Relief", location: "Durgapura" },
  { slug: "corporate-yoga-durgapura", title: "Corporate Yoga - Durgapura", category: "Corporate", location: "Durgapura" },
  { slug: "therapeutic-yoga-durgapura", title: "Therapeutic Yoga - Durgapura", category: "Therapeutic", location: "Durgapura" },
  { slug: "personal-yoga-classes-jagatpura", title: "Personal Yoga Classes - Jagatpura", category: "Personal", location: "Jagatpura" },
  { slug: "kids-yoga-jagatpura", title: "Kids Yoga - Jagatpura", category: "Kids", location: "Jagatpura" },
  { slug: "prenatal-yoga-jagatpura", title: "Prenatal Yoga - Jagatpura", category: "Prenatal", location: "Jagatpura" },
  { slug: "yoga-for-stress-jagatpura", title: "Yoga for Stress - Jagatpura", category: "Stress Relief", location: "Jagatpura" },
];

const categories = ["All", "Personal", "Kids", "Prenatal", "Stress Relief", "Corporate", "Therapeutic", "Online", "General"];
const locations = ["All", "Malviya Nagar", "Durgapura", "Jagatpura", "Jaipur", "India"];

const AdminTestPages = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [selectedLocation, setSelectedLocation] = React.useState("All");

  const filteredPages = landingPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || page.category === selectedCategory;
    const matchesLocation = selectedLocation === "All" || page.location === selectedLocation;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      color: "#fff",
      paddingTop: "100px",
      paddingBottom: "60px",
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
        <header style={{ marginBottom: "40px" }}>
          <h1 style={{
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            fontWeight: 700,
            background: "linear-gradient(135deg, #fff 0%, #2E7D5B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}>
            <LuLayoutDashboard size={32} style={{ color: "#2E7D5B" }} />
            All Landing Pages
          </h1>
          <p style={{ color: "#888", fontSize: "1.1rem", maxWidth: "600px" }}>
            Browse and test all SEO landing pages across locations and categories. Click any card to preview the live page.
          </p>
        </header>

        <div style={{
          display: "flex",
          gap: "24px",
          marginBottom: "32px",
          flexWrap: "wrap"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "rgba(46,125,91, 0.1)",
            border: "1px solid rgba(46,125,91, 0.2)",
            borderRadius: "100px",
            fontSize: "0.875rem",
            color: "#2E7D5B"
          }}>
            <span>{landingPages.length}</span>
            <span>Total Pages</span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "rgba(46,125,91, 0.1)",
            border: "1px solid rgba(46,125,91, 0.2)",
            borderRadius: "100px",
            fontSize: "0.875rem",
            color: "#2E7D5B"
          }}>
            <span>{[...new Set(landingPages.map(p => p.category))].length}</span>
            <span>Categories</span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "rgba(46,125,91, 0.1)",
            border: "1px solid rgba(46,125,91, 0.2)",
            borderRadius: "100px",
            fontSize: "0.875rem",
            color: "#2E7D5B"
          }}>
            <span>{[...new Set(landingPages.map(p => p.location))].length}</span>
            <span>Locations</span>
          </div>
        </div>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "32px",
          alignItems: "center"
        }}>
          <div style={{
            position: "relative",
            flex: 1,
            minWidth: "280px"
          }}>
            <LuSearch size={20} style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666"
            }} />
            <input
              type="text"
              placeholder="Search pages by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 18px 14px 48px",
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "0.95rem",
                transition: "all 0.2s",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2E7D5B";
                e.target.style.boxShadow = "0 0 0 3px rgba(46,125,91, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#333";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "14px 18px",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
              minWidth: "160px",
              outline: "none"
            }}
            onFocus={(e) => { e.target.style.borderColor = "#2E7D5B"; }}
            onBlur={(e) => { e.target.style.borderColor = "#333"; }}
          >
            {categories.map(cat => <option key={cat} value={cat} style={{ background: "#1a1a1a", color: "#fff" }}>{cat}</option>)}
          </select>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              padding: "14px 18px",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
              minWidth: "160px",
              outline: "none"
            }}
            onFocus={(e) => { e.target.style.borderColor = "#2E7D5B"; }}
            onBlur={(e) => { e.target.style.borderColor = "#333"; }}
          >
            {locations.map(loc => <option key={loc} value={loc} style={{ background: "#1a1a1a", color: "#fff" }}>{loc}</option>)}
          </select>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px"
        }}>
          {filteredPages.map((page) => (
            <Link
              key={page.slug}
              to={`/${page.slug}`}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "24px",
                background: "linear-gradient(145deg, #161616 0%, #1a1a1a 100%)",
                border: "1px solid #2a2a2a",
                borderRadius: "16px",
                color: "#fff",
                textDecoration: "none",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.borderColor = "#2E7D5B";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px #2E7D5B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 10px",
                    background: "rgba(46,125,91, 0.15)",
                    border: "1px solid rgba(46,125,91, 0.3)",
                    borderRadius: "100px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#2E7D5B"
                  }}>{page.category}</span>
                  <span style={{
                    padding: "4px 10px",
                    background: "rgba(76, 175, 80, 0.15)",
                    border: "1px solid rgba(76, 175, 80, 0.3)",
                    borderRadius: "100px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#4CAF50"
                  }}>{page.location}</span>
                </div>
              </div>
              <h3 style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                lineHeight: 1.4,
                marginBottom: "16px",
                color: "#fff"
              }}>{page.title}</h3>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "16px",
                borderTop: "1px solid #2a2a2a"
              }}>
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#2E7D5B",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  transition: "gap 0.2s"
                }}>
                  <span style={{ color: "#2E7D5B" }}>View Page</span>
                  <LuArrowRight size={16} style={{ color: "#2E7D5B" }} />
                </span>
                <LuExternalLink size={16} style={{ color: "#444", transition: "color 0.2s" }} />
              </div>
            </Link>
          ))}
          {filteredPages.length === 0 && (
            <div style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "60px 20px",
              color: "#888"
            }}>
              <LuSearch size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
              <p style={{ color: "#888" }}>No pages match your filters. Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

        <div style={{
          marginTop: "50px",
          padding: "30px",
          background: "linear-gradient(145deg, #111 0%, #161616 100%)",
          border: "1px solid #2a2a2a",
          borderRadius: "16px"
        }}>
          <h3 style={{
            fontSize: "1.1rem",
            color: "#2E7D5B",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <LuExternalLink size={20} />
            Quick Access URLs
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {landingPages.map((page) => (
              <code
                key={page.slug}
                style={{
                  padding: "8px 14px",
                  background: "#0a0a0a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontFamily: "'Monaco', 'Menlo', monospace",
                  color: "#888",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#2E7D5B";
                  e.target.style.color = "#2E7D5B";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "#2a2a2a";
                  e.target.style.color = "#888";
                }}
              >
                /{page.slug}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTestPages;