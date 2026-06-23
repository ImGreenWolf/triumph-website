

export async function getExistingEmailAddresses() {

    const res = await fetch('https://cpanel.interact-triumph.org/cpsess7848365911/execute/Email/list_pops_with_disk', {
        method: 'POST',
        body: JSON.stringify({
            'api.paginate_size': 1000
        })
    })
    const json = await res.json()

    console.log(json)
}