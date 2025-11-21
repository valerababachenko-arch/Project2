let readyStatus = document.querySelector('#readyStatus')
let notReadyStatus = document.querySelector('#notReadyStatus')
let myForm = document.querySelector('#myForm')
let contentArea = document.querySelector('#contentArea')
let formPopover = document.querySelector('#formPopover')
let createButton = document.querySelector('#createButton')
let formHeading = document.querySelector('#formPopover h2')
let filterDrinks = document.querySelector('#filterDrinks')
let filterMeals = document.querySelector('#filterMeals')
let filterAll = document.querySelector('#filterAll')

// Debug: log presence of critical elements (temporary)
console.log('script.js loaded')
console.log('Elements presence:', {
    readyStatus: !!readyStatus,
    notReadyStatus: !!notReadyStatus,
    myForm: !!myForm,
    contentArea: !!contentArea,
    formPopover: !!formPopover,
    createButton: !!createButton,
    formHeading: !!formHeading
})

// Polyfill / fallback for popover methods in browsers that don't support the Popover API
if (formPopover) {
    // Always wrap/override the existing showPopover/hidePopover so our
    // `.open` class and backdrop are applied consistently.
    const _nativeShow = formPopover.showPopover
    const _nativeHide = formPopover.hidePopover

    formPopover.showPopover = function () {
        this.classList.add('open')
        // simple backdrop using body class
        document.body.classList.add('popover-open')
        // ensure it's on top of other content
        this.style.zIndex = '99999'
        if (typeof _nativeShow === 'function') {
            try { _nativeShow.call(this) } catch (e) { /* ignore native errors */ }
        }
        console.log('formPopover.showPopover called (override)')
    }

    formPopover.hidePopover = function () {
        this.classList.remove('open')
        document.body.classList.remove('popover-open')
        if (typeof _nativeHide === 'function') {
            try { _nativeHide.call(this) } catch (e) { /* ignore native errors */ }
        }
        console.log('formPopover.hidePopover called (override)')
    }

    // Wire elements that use popovertargetaction="hide" to call hidePopover
    document.querySelectorAll('[popovertargetaction="hide"]').forEach(el => {
        el.addEventListener('click', () => formPopover.hidePopover())
    })
}

    // Helper: open the popover and focus the first input for immediate access
    const openPopoverAndFocus = () => {
        if (!formPopover) return
        if (typeof formPopover.showPopover === 'function') {
            formPopover.showPopover()
        }

        // Focus the first focusable control in the form for quick access
        try {
            if (myForm) {
                const first = myForm.querySelector('input, textarea, select, button')
                if (first) {
                    first.focus()
                }
            }
            // ensure the popover is scrolled into view on small screens
            formPopover.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } catch (err) {
            console.warn('openPopoverAndFocus: could not focus or scroll', err)
        }
    }

// Get form data and process each type of input
// Prepare the data as JSON with a proper set of types
// e.g. Booleans, Numbers, Dates
const getFormData = () => {
    // FormData gives a baseline representation of the form
    // with all fields represented as strings
    const formData = new FormData(myForm)
    const json = Object.fromEntries(formData)

    // Handle checkboxes, dates, and numbers
    myForm.querySelectorAll('input').forEach(el => {
        const value = json[el.name]
        const isEmpty = !value || value.trim() === ''

        // Represent checkboxes as a Boolean value (true/false)
        if (el.type === 'checkbox') {
            json[el.name] = el.checked
        }
        // Represent number and range inputs as actual numbers
        else if (el.type === 'number' || el.type === 'range') {
            json[el.name] = isEmpty ? null : Number(value)
        }
        // Represent all date inputs in ISO-8601 DateTime format
        else if (el.type === 'date') {
            json[el.name] = isEmpty ? null : new Date(value).toISOString()
        }
    })
    return json
}


// listen for form submissions  
if (myForm) {
    myForm.addEventListener('submit', async event => {
    // prevent the page from reloading when the form is submitted.
    event.preventDefault()
    const data = getFormData()
    await saveItem(data)
    myForm.reset()
    formPopover.hidePopover()
    })
} else {
    console.warn('myForm element not found — submit handler not attached')
}


// Save item (Create or Update)
const saveItem = async (data) => {
    console.log('Saving:', data)

    // Determine if this is an update or create
    const endpoint = data.id ? `/data/${data.id}` : '/data'
    const method = data.id ? "PUT" : "POST"

    const options = {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }

    try {
        const response = await fetch(endpoint, options)

        if (!response.ok) {
            try {
                const errorData = await response.json()
                console.error('Error:', errorData)
                alert(errorData.error || response.statusText)
            }
            catch (err) {
                console.error(response.statusText)
                alert('Failed to save: ' + response.statusText)
            }
            return
        }

        const result = await response.json()
        console.log('Saved:', result)


        // Refresh the data list
        getData()
    }
    catch (err) {
        console.error('Save error:', err)
        alert('An error occurred while saving')
    }
}


// Edit item - populate form with existing data
const editItem = (data) => {
    console.log('Editing:', data)

    // Populate the form with data to be edited
    Object.keys(data).forEach(field => {
        const element = myForm.elements[field]
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[field]
            } else if (element.type === 'date') {
                // Extract yyyy-mm-dd from ISO date string (avoids timezone issues)
                element.value = data[field] ? data[field].substring(0, 10) : ''
            } else {
                element.value = data[field]
            }
        }
    })

    // Update the heading to indicate edit mode
    formHeading.textContent = '🍲 Edit Recipe'

    // Show the popover and focus the form
    openPopoverAndFocus()
}

// Delete item
const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
        return
    }

    const endpoint = `/data/${id}`
    const options = { method: "DELETE" }

    try {
        const response = await fetch(endpoint, options)

        if (response.ok) {
            const result = await response.json()
            console.log('Deleted:', result)
            // Refresh the data list
            getData()
        }
        else {
            const errorData = await response.json()
            alert(errorData.error || 'Failed to delete item')
        }
    } catch (error) {
        console.error('Delete error:', error)
        alert('An error occurred while deleting')
    }
}


const calendarWidget = (date) => {
    if (!date) return ''
    const month = new Date(date).toLocaleString("en-CA", { month: 'short', timeZone: "UTC" })
    const day = new Date(date).toLocaleString("en-CA", { day: '2-digit', timeZone: "UTC" })
    const year = new Date(date).toLocaleString("en-CA", { year: 'numeric', timeZone: "UTC" })
    return ` <div class="calendar">
                <div class="born"><img src="./assets/birthday.svg" /></div>
                <div class="month">${month}</div>
                <div class="day">${day}</div> 
                <div class="year">${year}</div>
            </div>`

}

// Render a single item
const renderItem = (item) => {
    const div = document.createElement('div')
    div.classList.add('item-card')
    div.setAttribute('data-id', item.id)

    // Prepare ingredients list (comma-separated string in DB)
    const ingredientsHtml = item.ingredients ? `<ul>${item.ingredients.split(',').map(i => `<li>${i.trim()}</li>`).join('')}</ul>` : ''
    const stepsHtml = item.steps ? `<pre class="steps">${item.steps}</pre>` : ''
    const descriptionHtml = item.description ? `<section class="description"><p>${item.description}</p></section>` : ''

    const template = /*html*/`  
    <div class="item-heading">
        <h3>${item.title || '<i>Untitled</i>'}</h3>
        <div class="meta">
            <span class="type">${item.type || ''}</span>
            <span class="calories">${item.calories != null ? item.calories + ' kcal' : ''}</span>
            <span class="protein">${item.proteinGrams != null ? item.proteinGrams + ' g protein' : ''}</span>
        </div>
    </div>
    ${descriptionHtml}
    <div class="item-info">
        <section class="ingredients" style="${item.ingredients ? '' : 'display:none;'}">
            <h4>Ingredients</h4>
            ${ingredientsHtml}
        </section>
    </div>

    <section class="steps" style="${item.steps ? '' : 'display:none;'}">
        <h4>Steps</h4>
        ${stepsHtml}
    </section>


    <div class="item-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
    </div>
    `

    div.innerHTML = DOMPurify.sanitize(template);

    // Add event listeners to buttons
    div.querySelector('.edit-btn').addEventListener('click', () => editItem(item))
    div.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id))

    return div
}

// fetch items from API endpoint and populate the content div
const getData = async (filterType = null) => {
    try {
        const response = await fetch('/data')

        if (response.ok) {
            readyStatus.style.display = 'block'
            notReadyStatus.style.display = 'none'

            const data = await response.json()
            console.log('Fetched data:', data)

            // Apply front-end filter if requested
            let filteredData = data
            if (filterType) {
                filteredData = data.filter(item => item.type === filterType)
            }

            if (filteredData.length == 0) {
                contentArea.innerHTML = '<p><i>No data found in the database.</i></p>'
                return
            }
            else {
                contentArea.innerHTML = ''
                filteredData.forEach(item => {
                    const itemDiv = renderItem(item)
                    contentArea.appendChild(itemDiv)
                })
            }
        }
        else {
            // If the request failed, show the "not ready" status
            // to inform users that there may be a database connection issue
            notReadyStatus.style.display = 'block'
            readyStatus.style.display = 'none'
            createButton.style.display = 'none'
            contentArea.style.display = 'none'
        }
    } catch (error) {
        console.error('Error fetching data:', error)
        notReadyStatus.style.display = 'block'
    }
}

// Revert to the default form title on reset
myForm.addEventListener('reset', () => formHeading.textContent = '🍲 Share a Recipe')

// Reset the form when the create button is clicked.
if (createButton) {
    createButton.addEventListener('click', (e) => {
        console.log('createButton click', { formPopover: !!formPopover, myForm: !!myForm })
        if (!myForm) {
            console.error('createButton: myForm not found')
            return
        }
        if (!formPopover || typeof formPopover.showPopover !== 'function') {
            console.error('createButton: formPopover.showPopover unavailable', formPopover)
            return
        }
        myForm.reset()
        openPopoverAndFocus()
    })
} else {
    console.warn('createButton not found — click handler not attached')
}

// Filter buttons: set active state and wire clicks
const setActiveFilterButton = (activeButton) => {
    [filterAll, filterDrinks, filterMeals].forEach(btn => {
        if (!btn) return
        btn.classList.toggle('active', btn === activeButton)
    })
}

if (filterAll) {
    filterAll.addEventListener('click', () => {
        getData()
        setActiveFilterButton(filterAll)
    })
}
if (filterDrinks) {
    filterDrinks.addEventListener('click', () => {
        getData('drink')
        setActiveFilterButton(filterDrinks)
    })
}
if (filterMeals) {
    filterMeals.addEventListener('click', () => {
        getData('meal')
        setActiveFilterButton(filterMeals)
    })
}

// Load initial data
getData()
// Keep ALL active by default on initial load
setActiveFilterButton(filterAll)
