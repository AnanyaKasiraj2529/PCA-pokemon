from PIL import Image, ImageOps

def make_RGB(image):
    return image.convert("RGB")

def resize_image(image, size):
    resized = ImageOps.contain(image, (size, size), method=Image.Resampling.LANCZOS)
    position = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas = Image.new("RGB", (size, size), "white")
    canvas.paste(resized, position)
    return canvas

'''LANCZOS is a resampling filter from Pillow that determines how pixel values are calculated when an image is resized 
    It ues a wider neighbourhood to preserve detail when resizing, especially when reducing dimensions.'''

def handle_transparency(image, background):
    image = image.convert("RGBA")
    background_image = Image.new("RGBA", image.size, (*background, 255))
    return Image.alpha_composite(background_image, image)

def pre_process_image(path, size, background):
    with Image.open(path) as image:
        image.load()
        image = handle_transparency(image, background)

    image = make_RGB(image)
    image = resize_image(image, size)

    return image

'''Example:
image = pre_process_image("pikachu.png", 64, (255, 255, 255))
image.save("pikachu_processed.png") '''