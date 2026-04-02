const encodeTab = document.getElementById('encodeTab')
const decodeTab = document.getElementById('decodeTab')

const encodeSection = document.getElementById('encodeSection')
const decodeSection = document.getElementById('decodeSection')

const dropAreaEncode = document.getElementById('dropAreaEncode')
const dropAreaDecode = document.getElementById('dropAreaDecode')

const encodeInput = document.getElementById('encodeImage')
const decodeInput = document.getElementById('decodeImage')

const encodePreview = document.getElementById('encodePreview')
const decodePreview = document.getElementById('decodePreview')

const encodeBtn = document.getElementById('encodeBtn')
const decodeBtn = document.getElementById('decodeBtn')

const encodeProgress = document.getElementById('encodeProgress')
const decodeProgress = document.getElementById('decodeProgress')

const loader = document.getElementById('loader')

const messageInput = document.getElementById('message')
const passwordInput = document.getElementById('password')
const decodePasswordInput = document.getElementById('decodePassword')

const output = document.getElementById('decodedMessage')

window.onload = () => {
    setTimeout(() => {
        loader.style.display = 'none'
    }, 1000)
}

encodeTab.onclick = () => {
    encodeTab.classList.add('active')
    decodeTab.classList.remove('active')
    encodeSection.classList.remove('hidden')
    decodeSection.classList.add('hidden')
}

decodeTab.onclick = () => {
    decodeTab.classList.add('active')
    encodeTab.classList.remove('active')
    decodeSection.classList.remove('hidden')
    encodeSection.classList.add('hidden')
}

function setupDrop(area, input, preview) {
    area.onclick = () => input.click()

    input.onchange = () => {
        const file = input.files[0]
        const reader = new FileReader()
        reader.onload = e => {
            preview.src = e.target.result
            preview.style.display = 'block'
        }
        reader.readAsDataURL(file)
    }

    area.ondragover = e => {
        e.preventDefault()
        area.style.borderColor = '#6366f1'
    }

    area.ondragleave = () => {
        area.style.borderColor = ''
    }

    area.ondrop = e => {
        e.preventDefault()
        input.files = e.dataTransfer.files
        input.onchange()
    }
}

setupDrop(dropAreaEncode, encodeInput, encodePreview)
setupDrop(dropAreaDecode, decodeInput, decodePreview)

encodeBtn.onclick = async () => {
    const file = encodeInput.files[0]
    const message = messageInput.value
    const password = passwordInput.value

    if (!file || !message || !password) {
        alert('All fields required')
        return
    }

    const formData = new FormData()
    formData.append('image', file)
    formData.append('message', message)
    formData.append('password', password)

    encodeProgress.style.width = '30%'

    const response = await fetch('/encode', {
        method: 'POST',
        body: formData
    })

    encodeProgress.style.width = '70%'

    if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = 'encoded.png'
        a.click()

        encodeProgress.style.width = '100%'
    } else {
        alert('Encoding failed')
        encodeProgress.style.width = '0%'
    }
}

decodeBtn.onclick = async () => {
    const file = decodeInput.files[0]
    const password = decodePasswordInput.value

    if (!file || !password) {
        alert('All fields required')
        return
    }

    const formData = new FormData()
    formData.append('image', file)
    formData.append('password', password)

    decodeProgress.style.width = '30%'

    const response = await fetch('/decode', {
        method: 'POST',
        body: formData
    })

    decodeProgress.style.width = '70%'

    const data = await response.json()

    if (response.ok) {
        output.innerText = data.message
        decodeProgress.style.width = '100%'
    } else {
        output.innerText = data.error
        decodeProgress.style.width = '0%'
    }
}