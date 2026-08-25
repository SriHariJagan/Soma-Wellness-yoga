import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import s from './YogaAdmin.module.css';
import AdminQueryProvider from './AdminQueryClient';
import {
  LuLayoutDashboard, LuUsers, LuFilter, LuRadioTower, LuGraduationCap,
  LuReceipt, LuCalendarClock, LuFolderLock, LuMegaphone, LuTicketPercent, LuCalendar,
  LuSparkles, LuClock, LuGift, LuMail, LuBookOpen, LuCalendarCheck,
  LuCalendarDays, LuActivity, LuTruck,
} from 'react-icons/lu';

// Layout Shell Components
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import LogoutModal from './LogoutModal';

// Section Components — lazy-loaded per tab so the admin shell stays light
const DashboardInsights = lazy(() => import('./DashboardInsights'));
const StudentsHistory = lazy(() => import('./StudentsHistory'));
const PipelineCRMLeads = lazy(() => import('./PipelineCRMLeads'));
const BatchesStreams = lazy(() => import('./BatchesStreams'));
const WorkshopManagement = lazy(() => import('./WorkshopManagement'));
const EventsManagement = lazy(() => import('./EventsManagement'));
const CoursesPlans = lazy(() => import('./CoursesPlans'));
const ServicesManagement = lazy(() => import('./ServicesManagement'));
const ReportsInvoices = lazy(() => import('./ReportsInvoices'));
const AdminConsultationManagement = lazy(() => import('./AdminConsultationManagement'));
const TimeSlotManagement = lazy(() => import('./TimeSlotManagement'));
const ContentControl = lazy(() => import('./ContentControl'));
const CommsWebConfig = lazy(() => import('./CommsWebConfig'));
const CouponManagement = lazy(() => import('./CouponManagement'));
const FreeTrialManagement = lazy(() => import('./FreeTrialManagement'));
const ClassInvites = lazy(() => import('./ClassInvites'));
const YTTCInvites = lazy(() => import('./YTTCInvites'));
const AttendanceManagement = lazy(() => import('./AttendanceManagement'));
const BlogManagement = lazy(() => import('./BlogManagement'));
const EmailHealth = lazy(() => import('./EmailHealth'));
const BookManagement = lazy(() => import('./BookManagement'));
const StoreOrders = lazy(() => import('./StoreOrders'));
const ShippingManagement = lazy(() => import('./ShippingManagement'));
const BulkEnquiries = lazy(() => import('./BulkEnquiries'));

import {
  getOverview, getPayments, getConsultations, getStudents,
  coursesApi, membershipPlansApi, couponsApi, assetsApi,
  createStudent,
  getLeads, getBatches,
} from '../api/AdminServices.js';
import {
  AddStudentModal, AddLeadModal, NewBatchModal, RecordPaymentModal,
} from './QuickActionModals';

const TabFallback = () => (
  <div className={s.tabFallback} role="status" aria-label="Loading section">
    Loading…
  </div>
);

export default function YogaAdmin({ onLogout = () => {} }) {
  const [activeTab, setActiveTab] = useState('insights');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickModal, setQuickModal] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Live data pulled from MongoDB via the admin API.
  const [overview, setOverview] = useState({ metrics: {}, systemHealth: [], todaySchedule: [], recentStudents: [] });
  const [students, setStudents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [consultations, setConsultations] = useState([]);

  // Form states
  const [studentForm, setStudentForm] = useState({ name: '', email: '', phone: '', city: '', style: '', level: '', batch: '', plan: '' });
  const [batchForm, setBatchForm] = useState({ name: '', timing: '', trainer: '', zoomLink: '' });


  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4500);
  };

  const loadAll = useCallback(async () => {
    const safe = (p) => p.then((v) => v).catch(() => null);
    const [ov, st, ld, bt, co, pl, cp, dl, pay, cons] = await Promise.all([
      safe(getOverview()), safe(getStudents()), safe(getLeads()), safe(getBatches()),
      safe(coursesApi.list()), safe(membershipPlansApi.list()), safe(couponsApi.list()),
      safe(assetsApi.list()), safe(getPayments()), safe(getConsultations()),
    ]);
    if (ov) setOverview(ov);
    if (st) setStudents(st);
    if (ld) setLeads(ld);
    if (bt) setBatches(bt);
    if (co) setCourses(co);
    if (pl) setPlans(pl);
    if (cp) setCoupons(cp);
    if (dl) setContentItems(dl);
    if (pay) setPayments(pay);
    if (cons) setConsultations(cons);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const NAV_ITEMS = [
    { id: 'insights',       label: 'Dashboard',            icon: <LuLayoutDashboard /> },
    { id: 'students',       label: 'Students',             icon: <LuUsers />,         badge: students.length || null },
    { id: 'leads',          label: 'Pipeline CRM',         icon: <LuFilter />,        badge: (overview.totalLeads ?? leads.length) || null },
    { id: 'batches',        label: 'Batches & Streams',    icon: <LuRadioTower /> },
    { id: 'class-invites',  label: 'Class Invites',        icon: <LuMail /> },
    { id: 'yttc-invites',   label: 'YTTC Invites',         icon: <LuBookOpen /> },
    { id: 'attendance-mgmt',label: 'Attendance',           icon: <LuCalendarCheck /> },
    { id: 'workshops',      label: 'Workshops',            icon: <LuCalendar /> },
    { id: 'events',         label: 'Events Management',    icon: <LuCalendarDays /> },
    { id: 'curriculum',     label: 'Courses & Plans',      icon: <LuGraduationCap /> },
    { id: 'services',       label: 'Services',             icon: <LuSparkles /> },
    { id: 'attendance',     label: 'Reports & Invoices',   icon: <LuReceipt /> },
    { id: 'consultations',  label: 'Consultations',        icon: <LuCalendarClock /> },
    { id: 'time-slots',     label: 'Time Slots',            icon: <LuClock /> },
    { id: 'content',        label: 'Content Control',      icon: <LuFolderLock /> },
    { id: 'comms',          label: 'Communication',        icon: <LuMegaphone /> },
    { id: 'rewards',          label: 'Coupons & Referrals',  icon: <LuTicketPercent /> },
    { id: 'free-trials',      label: 'Free Trial',           icon: <LuGift /> },
    { id: 'blog-mgmt',        label: 'Blog Management',      icon: <LuSparkles /> },
    { id: 'email-health',     label: 'Email Health',         icon: <LuActivity /> },
    { id: 'store-books',      label: 'Store — Books',        icon: <LuBookOpen /> },
    { id: 'store-orders',     label: 'Store — Orders',       icon: <LuReceipt />,   badge: overview.bookStore?.pendingDispatch || null },
    { id: 'store-shipping',   label: 'Store — Shipping',     icon: <LuTruck /> },
    { id: 'store-bulk',       label: 'Store — Bulk',         icon: <LuUsers />,     badge: overview.bookStore?.newBulkEnquiries || null },
  ];

  // Derived feed data for the topbar (presentation only).
  const recentStudents = overview.recentStudents?.length ? overview.recentStudents : students.slice(0, 4);
  const topActivity = recentStudents.slice(0, 5).map((st) => ({
    title: `${st.name || 'New student'} registered`,
    meta: st.city || st.email || 'Student CRM',
    color: '#F97316',
  }));
  const topNotifs = [
    (overview.metrics?.pendingBookings ? { title: `${overview.metrics.pendingBookings} pending bookings`, meta: 'Bookings need confirmation', color: '#D97706' } : null),
    (leads.length ? { title: `${overview.totalLeads ?? leads.length} active leads in pipeline`, meta: 'Pipeline CRM', color: '#81B29A' } : null),
    (overview.metrics?.newThisMonth ? { title: `${overview.metrics.newThisMonth} new members this month`, meta: 'Growth', color: '#16A34A' } : null),
  ].filter(Boolean);

  const goCreate = () => { setActiveTab('insights'); setQuickModal('student'); setMobileOpen(false); };
  const closeModal = () => { setQuickModal(null); };
  const afterCreate = () => { closeModal(); loadAll(); };
  const handleQuickAction = (key) => { setActiveTab('insights'); setQuickModal(key); };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setQuickModal(null);
    setMobileOpen(false);
    if (tab !== 'students') setSelectedStudentId(null);
  };

  // Create a student through the admin API (persists to MongoDB).
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.email || !studentForm.phone) {
      flash('Error: Name, Email, and Phone are mandatory.', 'error');
      return;
    }
    const planMonths = studentForm.plan === 'Annual Pass' ? 12 : studentForm.plan === 'Quarterly Pass' ? 3 : studentForm.plan === 'Monthly Pass' ? 1 : 0;
    try {
      await createStudent({
        name: studentForm.name, email: studentForm.email, phone: studentForm.phone,
        city: studentForm.city || '', style: studentForm.style || 'Hatha',
        level: studentForm.level || 'Beginner', planMonths,
      });
      flash(`Student ${studentForm.name} created. Credentials emailed.`, 'success');
      setStudentForm({ name: '', email: '', phone: '', city: '', style: '', level: '', batch: '', plan: '' });
      await loadAll();
    } catch (err) {
      flash(err.message || 'Failed to create student.', 'error');
    }
  };

  const adminUser = { name: 'Studio Admin', role: 'Studio Administrator', avatar: 'SA' };

  return (
    <AdminQueryProvider>
    <div className={`${s.shell} ${collapsed ? s.shellCollapsed : ''}`}>
      {mobileOpen && <div className={s.backdrop} onClick={() => setMobileOpen(false)} />}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        navItems={NAV_ITEMS}
        user={adminUser}
        onSignOut={() => setShowLogoutModal(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onQuickCreate={goCreate}
      />

      <div className={s.contentArea}>
        <Topbar
          onMobileMenu={() => setMobileOpen(true)}
          onQuickCreate={goCreate}
          notifications={topNotifs}
          activity={topActivity}
          user={adminUser}
        />

        <main className={s.main}>
        {activeTab === 'insights' && (
          <Suspense fallback={<TabFallback />}>
            <DashboardInsights
              data={overview}
              totalLeads={overview.totalLeads ?? leads.length}
              totalBatches={overview.totalBatches ?? batches.length}
              onRefresh={loadAll}
              onQuickAction={handleQuickAction}
            />
          </Suspense>
        )}
        {activeTab === 'students' && (
          <Suspense fallback={<TabFallback />}>
            <StudentsHistory
              students={students}
              form={studentForm}
              setForm={setStudentForm}
              onSave={handleSaveStudent}
              onChanged={loadAll}
              feedback={feedback}
              selectedStudentId={selectedStudentId}
            />
          </Suspense>
        )}
        {activeTab === 'leads' && <Suspense fallback={<TabFallback />}><PipelineCRMLeads leads={leads} onChanged={loadAll} /></Suspense>}
        {activeTab === 'batches' && <Suspense fallback={<TabFallback />}><BatchesStreams form={batchForm} setForm={setBatchForm} onChanged={loadAll} /></Suspense>}
        {activeTab === 'class-invites' && <Suspense fallback={<TabFallback />}><ClassInvites /></Suspense>}
        {activeTab === 'yttc-invites' && <Suspense fallback={<TabFallback />}><YTTCInvites /></Suspense>}
        {activeTab === 'attendance-mgmt' && <Suspense fallback={<TabFallback />}><AttendanceManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'workshops' && <Suspense fallback={<TabFallback />}><WorkshopManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'events' && <Suspense fallback={<TabFallback />}><EventsManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'curriculum' && <Suspense fallback={<TabFallback />}><CoursesPlans courses={courses} plans={plans} /></Suspense>}
        {activeTab === 'services' && <Suspense fallback={<TabFallback />}><ServicesManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'attendance' && (
          <Suspense fallback={<TabFallback />}>
            <ReportsInvoices
              payments={payments}
              metrics={overview.metrics}
              onViewStudent={(id) => { setSelectedStudentId(id); setActiveTab('students'); }}
            />
          </Suspense>
        )}
        {activeTab === 'consultations' && <Suspense fallback={<TabFallback />}><AdminConsultationManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'time-slots' && <Suspense fallback={<TabFallback />}><TimeSlotManagement /></Suspense>}
        {activeTab === 'content' && <Suspense fallback={<TabFallback />}><ContentControl contentItems={contentItems} onRefresh={loadAll} /></Suspense>}
        {activeTab === 'comms' && <Suspense fallback={<TabFallback />}><CommsWebConfig feedback={feedback} /></Suspense>}
        {activeTab === 'rewards' && <Suspense fallback={<TabFallback />}><CouponManagement feedback={feedback} /></Suspense>}
        {activeTab === 'free-trials' && <Suspense fallback={<TabFallback />}><FreeTrialManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'blog-mgmt' && <Suspense fallback={<TabFallback />}><BlogManagement onChanged={loadAll} /></Suspense>}
        {activeTab === 'email-health' && <Suspense fallback={<TabFallback />}><EmailHealth /></Suspense>}
        {activeTab === 'store-books' && <Suspense fallback={<TabFallback />}><BookManagement /></Suspense>}
        {activeTab === 'store-orders' && <Suspense fallback={<TabFallback />}><StoreOrders /></Suspense>}
        {activeTab === 'store-shipping' && <Suspense fallback={<TabFallback />}><ShippingManagement /></Suspense>}
        {activeTab === 'store-bulk' && <Suspense fallback={<TabFallback />}><BulkEnquiries /></Suspense>}
        </main>
      </div>

      {showLogoutModal && (
        <LogoutModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => { setShowLogoutModal(false); onLogout(); }}
        />
      )}

      {quickModal === 'student' && <AddStudentModal onClose={closeModal} onSuccess={afterCreate} />}
      {quickModal === 'lead' && <AddLeadModal onClose={closeModal} onSuccess={afterCreate} />}
      {quickModal === 'batch' && <NewBatchModal onClose={closeModal} onSuccess={afterCreate} />}
      {quickModal === 'payment' && <RecordPaymentModal onClose={closeModal} onSuccess={afterCreate} />}
    </div>
    </AdminQueryProvider>
  );
}
