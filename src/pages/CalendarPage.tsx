import React from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import refreshIcon from '/icons/refresh.png'
import printIcon from '/icons/Vector.png'
import filterIcon from '/icons/icon-2.png'
import arrowLeft from '/icons/Vector-1.png'
import arrowRight from '/icons/Vector.png'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const events = [
  // Example events
  { title: 'General Appointment', start: new Date(2025, 3, 9, 10, 0), end: new Date(2025, 3, 9, 11, 0) },
  { title: 'Echodiagram', start: new Date(2025, 3, 9, 11, 0), end: new Date(2025, 3, 9, 12, 0) },
]

function CalendarPage() {
  const [view, setView] = React.useState<View>(Views.MONTH)
  const [date, setDate] = React.useState(new Date())

  const handleNavigate = (action: 'PREV'|'NEXT'|'TODAY') => {
    if (action === 'TODAY') { setDate(new Date()); return }
    let newDate = date
    if (view === Views.MONTH) newDate = action === 'PREV' ? subMonths(date, 1) : addMonths(date, 1)
    else if (view === Views.WEEK) newDate = action === 'PREV' ? subWeeks(date, 1) : addWeeks(date, 1)
    else if (view === Views.DAY) newDate = action === 'PREV' ? subDays(date, 1) : addDays(date, 1)
    setDate(newDate)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">April 2025</h2>
        <div className="flex items-center space-x-2">
          <button onClick={() => handleNavigate('PREV')}><img src={arrowLeft} className="h-5 w-5" alt="Prev"/></button>
          <button onClick={() => handleNavigate('TODAY')} className="px-3 py-1 bg-gray-200 rounded">Today</button>
          <button onClick={() => handleNavigate('NEXT')}><img src={arrowRight} className="h-5 w-5" alt="Next"/></button>
        </div>
        <div className="flex space-x-2">
          {[
            { label: 'Day', key: Views.DAY },
            { label: 'Week', key: Views.WEEK },
            { label: 'Month', key: Views.MONTH },
            { label: 'Appointments', key: Views.AGENDA }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setView(opt.key)}
              className={`px-3 py-1 rounded ${view === opt.key ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{format(date, 'MMMM yyyy')}</h2>
      </div>
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={date}
        view={view}
        onNavigate={(newDate) => setDate(newDate)}
        onView={(newView) => setView(newView)}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        style={{ height: '75vh' }}
      />
    </div>
  )
}

export default CalendarPage 