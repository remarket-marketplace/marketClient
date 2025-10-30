export function useImages() {
  const getImage = (path: string) => {
    return new URL(`../assets/images/${path}`, import.meta.url).href
  }

  const images = {
    avatars: {
      default: getImage('profile.png'),
    },
    chat: {
      send: getImage('send.svg'),
    }
  }

  return {
    getImage,
    images
  }
}