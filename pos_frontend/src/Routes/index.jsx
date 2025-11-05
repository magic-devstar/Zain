import TutorialsList from '../Pages/common/Tutorials/TutorialsList';
import TutorialDetail from '../Pages/common/Tutorials/TutorialDetail';
import CreateTutorial from '../Pages/common/Tutorials/CreateTutorial';
import EditTutorial from '../Pages/common/Tutorials/EditTutorial';
import TicketCalendarPage from '../Pages/common/TicketCalendarPage';

// ... existing code ...

// Add these routes in the appropriate place in your router configuration
{
  path: '/tutorials',
  element: <TutorialsList />,
},
{
  path: '/tutorials/create',
  element: <CreateTutorial />,
},
{
  path: '/tutorials/:id',
  element: <TutorialDetail />,
},
{
  path: '/tutorials/:id/edit',
  element: <EditTutorial />,
},
{
  path: "calendar",
  element: <TicketCalendarPage />,
},
// ... existing code ... 