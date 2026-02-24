import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)

    useEffect(() => {
        // Check if already running as standalone PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
        }

        const handler = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e as BeforeInstallPromptEvent)
        }

        const appInstalledHandler = () => {
            setIsInstalled(true)
            setInstallPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', handler)
        window.addEventListener('appinstalled', appInstalledHandler)

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('appinstalled', appInstalledHandler)
        }
    }, [])

    const triggerInstall = async () => {
        if (!installPrompt) return

        setIsInstalling(true)
        try {
            await installPrompt.prompt()
            const { outcome } = await installPrompt.userChoice
            if (outcome === 'accepted') {
                setIsInstalled(true)
                setInstallPrompt(null)
            }
        } finally {
            setIsInstalling(false)
        }
    }

    const canInstall = !isInstalled && installPrompt !== null

    return { canInstall, isInstalled, isInstalling, triggerInstall }
}
