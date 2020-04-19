export function Tabs(onToggle = undefined) {
    /**
     * @type {HTMLElement[]}
     */
    const el = document.querySelectorAll('[data-tab-target]');
    
    /**
     * @type {HTMLElement[]}
    */
    const tabs = document.querySelectorAll('[data-tab-name]');

    let active = undefined;

    const _clicked = ({target})=>{
        active = target;
        el.forEach((e)=>{
            e.classList.toggle('active', e === target);
        });

        tabs.forEach((e)=>{
            e.classList.toggle('active', e.dataset.tabName === active.dataset.tabTarget);
        });

        onToggle && onToggle(active, active.dataset.tabTarget.trim());
    }

    el.forEach((e)=>{
        e.addEventListener('click', _clicked);
    });

    _clicked({target:document.querySelector('.active[data-tab-target]')})
}